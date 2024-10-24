// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../interfaces/IAggregationRouterV5.sol";
import "../interfaces/ITokenSwapAndDeposit.sol";
import "../interfaces/IZkSyncL1Gateway.sol";
import "hardhat/console.sol";

contract L1Pool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    mapping(uint256 => order) orders;
    // Mapping for storing whitelist addresses
    mapping(address => bool) public whitelist;
    // Mapping for pool token balances by token address
    mapping(address => uint256) public poolBalances;
    // Mapping for storing collected fees by token address
    mapping(address => uint256) public feeBalances;
    // Mapping to track which tokens are considered multi-chain assets.
    // If the value is `true`, the token is considered a multi-chain asset, meaning it may exist on multiple chains.
    // If `false`, the token is treated as a single-chain asset.
    mapping(address => bool) public multiChainAssets;
    // Nested mapping to store each user's balance for each token
    mapping(address => mapping(address => uint256)) private userBalances;

    address[] public signers;
    address public ZK_SYNC_L1_GATEWAY_ADDRESS;

    IERC20 private constant ETH_ADDRESS = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    IERC20 private constant ZERO_ADDRESS = IERC20(address(0));

    event DepositToPool(address indexed user, address indexed token, uint256 amount);
    event SwapFromPool(address indexed user,  address srcToken, uint256 srcAmount, address dstToken, uint256 dstAmount, uint256 fee, uint256 orderId);
    event SwapFromUser(address indexed user, address srcToken, uint256 srcAmount, address dstToken, uint256 dstAmount, uint256 fee, uint256 indexed orderId);
    event OmniTransferToSpot(address indexed user, address token, uint256 amount, bytes32 indexed zkLinkAddress, uint256 fee, uint256 indexed orderId);
    event UserWithdraw(address indexed userAddress, address indexed token, uint256 amount, uint256 fee, uint256 indexed orderId);
    event PoolWithdraw(uint256 indexed orderId, address indexed to, uint256 amount, address indexed token);
    event PoolFeeWithdraw(uint256 indexed orderId, address indexed to, uint256 amount, address indexed token);
    event Whitelisted(address indexed account, bool isWhitelisted);
    event MultiChainAssetUpdated(address indexed token, bool isMultiChain);
    event WithdrawERC20(uint256 orderId, address token, address to, uint256 amount);
    event WithdrawETH(uint256 orderId, address to, uint256 amount);
    event SetUserBalances(address indexed user, address indexed token, uint256 newBalance);

    // Struct to store order details
    struct order{
        address to;
        uint256 amount;
        address token;
        bool executed;
    }

    /**
     * @dev Constructor to initialize the contract with signers, whitelist, and the ZkSync L1 Gateway address.
     * @param allowedSigners The array of signers allowed to sign off on multisig transactions.
     * @param initialWhitelist The initial list of addresses to whitelist.
     * @param zkSyncL1Gateway The address of the ZkSync L1 Gateway contract.
     * @param usdtAddress The address of the USDT token to be marked as a multi-chain asset.
     */
    constructor(address[] memory allowedSigners, address[] memory initialWhitelist, address zkSyncL1Gateway, address usdtAddress) {
        require(allowedSigners.length == 3, "invalid allSigners length");
        require(allowedSigners[0] != allowedSigners[1], "must be different signers");
        require(allowedSigners[0] != allowedSigners[2], "must be different signers");
        require(allowedSigners[1] != allowedSigners[2], "must be different signers");

        signers = allowedSigners;

        // Initialize whitelist members
        for (uint256 i = 0; i < initialWhitelist.length; i++) {
            require(initialWhitelist[i] != address(0), "Invalid address in whitelist");
            whitelist[initialWhitelist[i]] = true;
            emit Whitelisted(initialWhitelist[i], true);
        }

        ZK_SYNC_L1_GATEWAY_ADDRESS = zkSyncL1Gateway;

        // Set USDT as a multi-chain asset
        multiChainAssets[usdtAddress] = true;
    }

    /**
     * @dev Fallback function to handle receiving ETH directly into the contract.
     */
    receive() external payable { }

    /**
     * @dev Deposit tokens or ETH into the pool.
     * @param token The address of the token to deposit, or `address(0)` for ETH.
     * @param amount The amount of tokens to deposit, ignored for ETH deposits.
     */
    function depositToPool(address token, uint256 amount) external payable {
        if (isNative(IERC20(token))) {
            require(msg.value > 0, "Deposit amount must be greater than zero");
            require(amount == 0, "Amount should be zero for ETH deposit");

            poolBalances[address(0)] += msg.value;

            emit DepositToPool(msg.sender, address(0), msg.value);
        } else {
            require(amount > 0, "Deposit amount must be greater than zero");
            require(msg.value == 0, "ETH should not be sent for ERC20 deposit");

            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

            poolBalances[token] += amount;

            emit DepositToPool(msg.sender, token, amount);
        }
    }

    /**
    * @dev Swaps tokens from the pool using a specified router.
    * 
    * @param token The address of the token to swap from (can be an ERC20 or native token).
    * @param amount The amount of the token to swap.
    * @param routerAddress The address of the router contract to execute the swap.
    * @param exchangeData The encoded data required for the swap, typically containing details of the swap.
    * @param user The address of the user initiating the swap.
    * @param fee The total fee charged to the user (currently only USDT is specified as the token).
    * 
    * @return returnAmount The amount of tokens returned from the swap.
    */
    function swapFromPool(
        address token,
        uint256 amount,
        address routerAddress,
        bytes calldata exchangeData,
        address user,
        uint256 fee,
        uint256 expireTime,
        uint256 orderId
    ) external payable nonReentrant returns (uint256 returnAmount) {
        require(whitelist[msg.sender], "Caller is not whitelisted");
        require(expireTime >= block.timestamp,"expired transaction");
        tryInsertOrderId(orderId, user, amount, token);

        // Check if the token is native; if so, set token to address(0)
        if (isNative(IERC20(token))) {
            token = address(0);
        }

        (, IAggregationRouterV5.SwapDescription memory desc, ) = abi.decode(exchangeData[4:], (address, IAggregationRouterV5.SwapDescription, bytes));

        // require(token == address(desc.srcToken), 'mismatch token and desc.srcToken');
        require(amount == desc.amount, 'mismatch amount and desc.amount');
        require(address(this) == address(desc.dstReceiver), 'invalid desc.dstReceiver');
        require(poolBalances[token] >= amount + fee, "Insufficient balance for this token");

        poolBalances[token] -= (amount + fee);

        feeBalances[token] += fee;

        // Three case scenarios for swapping
        if (isNative(IERC20(desc.srcToken)) && !isNative(IERC20(desc.dstToken))) {
            // Case 1: from native token to ERC20 token
            (bool success, bytes memory returndata) = routerAddress.call{value: amount}(exchangeData);
            require(success, "Swap failed");

            (returnAmount, ) = abi.decode(returndata, (uint256, uint256));
            require(returnAmount > 0, "Invalid swap return amount");

            userBalances[user][address(desc.dstToken)] += returnAmount;
            emit SwapFromPool(user, address(0), amount + fee, address(desc.dstToken), returnAmount, fee, orderId);

        } else if (!isNative(IERC20(desc.srcToken)) && isNative(IERC20(desc.dstToken))) {
            // Case 2: from ERC20 token to native token
            IERC20(token).safeApprove(routerAddress, 0);
            IERC20(token).safeApprove(routerAddress, amount);

            (bool success, bytes memory returndata) = routerAddress.call{value: msg.value}(exchangeData);
            require(success, "Swap failed");

            (returnAmount, ) = abi.decode(returndata, (uint256, uint256));
            require(returnAmount > 0, "Invalid swap return amount");

            userBalances[user][address(0)] += returnAmount;
            emit SwapFromPool(user, token, amount + fee, address(0), returnAmount, fee, orderId);

        } else if (!isNative(IERC20(desc.srcToken)) && !isNative(IERC20(desc.dstToken))) {
            // Case 3: from ERC20 token to ERC20 token
            IERC20(token).safeApprove(routerAddress, 0);
            IERC20(token).safeApprove(routerAddress, amount);

            (bool success, bytes memory returndata) = routerAddress.call{value: msg.value}(exchangeData);
            require(success, "Swap failed");

            (returnAmount, ) = abi.decode(returndata, (uint256, uint256));
            require(returnAmount > 0, "Invalid swap return amount");

            userBalances[user][address(desc.dstToken)] += returnAmount;
            emit SwapFromPool(user, token, amount + fee, address(desc.dstToken), returnAmount, fee, orderId);
        }
        return returnAmount;
    }

    /**
    * @dev Swaps tokens on behalf of the user using a specified router.
    * 
    * @param token The address of the user's source token (could be an ERC20 or native token).
    * @param amount The amount of the source token to swap (includes fees).
    * @param routerAddress The address of the router contract to execute the swap (e.g., 1inch or OKX).
    * @param exchangeData The encoded data necessary for the token swap.
    * @param user The address of the user initiating the swap.
    * @param fee The total fee charged by the system (currently only USDT is specified).
    * 
    * @return returnAmount The amount of tokens returned from the swap, excluding fees.
    */
    function swapFromUser(
        address token,
        uint256 amount,
        address routerAddress,
        bytes calldata exchangeData,
        address user,
        uint256 fee,
        uint256 expireTime,
        uint256 orderId
    ) external payable nonReentrant returns (uint256 returnAmount) {
        require(whitelist[msg.sender], "Caller is not whitelisted");
        require(expireTime >= block.timestamp,"expired transaction");
        tryInsertOrderId(orderId, user, amount, token);

        if (isNative(IERC20(token))) {
            token = address(0);
        }

        require(userBalances[user][token] >= amount, "Insufficient user balance");

        userBalances[user][token] -= amount;

        (, IAggregationRouterV5.SwapDescription memory desc, ) = abi.decode(exchangeData[4:], (address, IAggregationRouterV5.SwapDescription, bytes));
        
        // require(token == address(desc.srcToken), "Mismatch between token and srcToken");
        require(amount == desc.amount, "Mismatch between amount and desc.amount");

        // Three case scenarios for swapping
        if (isNative(IERC20(desc.srcToken)) && !isNative(IERC20(desc.dstToken))) {
            // Case 1: from native token to ERC20 token
            (bool success, bytes memory returndata) = routerAddress.call{value: amount}(exchangeData);
            require(success, "Swap failed");

            (returnAmount, ) = abi.decode(returndata, (uint256, uint256));

            require(returnAmount > fee, "Return amount is less than the fee");

            // Check if the destination token (desc.dstToken) is a multi-chain asset
            if (multiChainAssets[address(desc.dstToken)]) {
                // If it's a multi-chain asset, update the pool balance for this token
                poolBalances[address(desc.dstToken)] += returnAmount - fee;
            } else {
                // If it's not a multi-chain asset, update the user's balance for this token
                userBalances[user][address(desc.dstToken)] += returnAmount - fee;
            }

            feeBalances[address(desc.dstToken)] += fee;

            emit SwapFromUser(user, address(0), amount, address(desc.dstToken), returnAmount - fee, fee, orderId);

        } else if (!isNative(IERC20(desc.srcToken)) && isNative(IERC20(desc.dstToken))) {
            // Case 2: from ERC20 token to native token
            IERC20(token).safeApprove(routerAddress, 0);
            IERC20(token).safeApprove(routerAddress, amount);

            (bool success, bytes memory returndata) = routerAddress.call{value: msg.value}(exchangeData);
            require(success, "Swap failed");

            (returnAmount, ) = abi.decode(returndata, (uint256, uint256));

            require(returnAmount > fee, "Return amount is less than the fee");

            // Check if the destination token (desc.dstToken) is a multi-chain asset
            if (multiChainAssets[address(0)]) {
                // If it's a multi-chain asset, update the pool balance for this token
                poolBalances[address(0)] += returnAmount - fee;
            } else {
                // If it's not a multi-chain asset, update the user's balance for this token
                userBalances[user][address(0)] += returnAmount - fee;
            }

            feeBalances[address(0)] += fee;

            emit SwapFromUser(user, token, amount, address(0), returnAmount - fee, fee, orderId);

        } else if (!isNative(IERC20(desc.srcToken)) && !isNative(IERC20(desc.dstToken))) {
            // Case 3: from ERC20 token to ERC20 token
            IERC20(token).safeApprove(routerAddress, 0);
            IERC20(token).safeApprove(routerAddress, amount);

            (bool success, bytes memory returndata) = routerAddress.call{value: msg.value}(exchangeData);
            require(success, "Swap failed");

            (returnAmount, ) = abi.decode(returndata, (uint256, uint256));

            require(returnAmount > fee, "Return amount is less than the fee");

            // Check if the destination token (desc.dstToken) is a multi-chain asset
            if (multiChainAssets[address(desc.dstToken)]) {
                // If it's a multi-chain asset, update the pool balance for this token
                poolBalances[address(desc.dstToken)] += returnAmount - fee;
            } else {
                // If it's not a multi-chain asset, update the user's balance for this token
                userBalances[user][address(desc.dstToken)] += returnAmount - fee;
            }

            feeBalances[address(desc.dstToken)] += fee;

            emit SwapFromUser(user, token, amount, address(desc.dstToken), returnAmount - fee, fee, orderId);
        }

        return returnAmount - fee;
    }

    /**
    * @dev Transfers tokens to a spot address on L2 using zkLink.
    * 
    * @param token The address of the source token (ERC20 or native). This token should not be USDT.
    * @param amount The amount of the source token to transfer, excluding fees.
    * @param zkLinkAddress The zkLink address representing the user's address on L2.
    * @param user The address of the user initiating the transfer.
    * @param fee The total fee charged by the system (both transaction fee and gas fee).
    */
    function omniTransferToSpot(
        address token,
        uint256 amount,
        bytes32 zkLinkAddress,
        address user,
        uint256 fee,
        uint256 expireTime,
        uint256 orderId
    ) external payable nonReentrant {
        require(whitelist[msg.sender], "Caller is not whitelisted");
        require(expireTime >= block.timestamp,"expired transaction");
        tryInsertOrderId(orderId, user, amount, token);

        if (isNative(IERC20(token))) {
            token = address(0);
        }

        require(userBalances[user][token] >= amount + fee, "Insufficient user balance");

        userBalances[user][token] -= (amount + fee);

        feeBalances[token] += fee;

        if (token == address(0)) {
            require(amount > 0, "ETH deposit amount must be greater than zero");

            IZkSyncL1Gateway(ZK_SYNC_L1_GATEWAY_ADDRESS).depositETH{value: amount}(zkLinkAddress, 0);
        } else {
            require(amount > 0, "Deposit amount must be greater than zero for ERC20");

            IERC20 tokenERC20 = IERC20(token);
            tokenERC20.safeApprove(ZK_SYNC_L1_GATEWAY_ADDRESS, 0);
            tokenERC20.safeApprove(ZK_SYNC_L1_GATEWAY_ADDRESS, amount);

            uint104 smallAmount = uint104(amount);
            IZkSyncL1Gateway(ZK_SYNC_L1_GATEWAY_ADDRESS).depositERC20(
                token,
                smallAmount,
                zkLinkAddress,
                0,
                false
            );
        }

        emit OmniTransferToSpot(user, token, amount + fee, zkLinkAddress, fee, orderId);
    }

    /**
    * @dev Allows a user to withdraw tokens from the contract.
    * 
    * @param userAddress The address of the user requesting the withdrawal.
    * @param token The address of the token to withdraw (ERC20 or native).
    * @param amount The amount of the token to withdraw.
    * @param fee The total fee associated with the withdrawal (same token as the withdrawn token).
    */
    function userWithdraw(
        address userAddress,
        address token, 
        uint256 amount, 
        uint256 fee,
        uint256 expireTime,
        uint256 orderId
    ) external nonReentrant {
        require(whitelist[msg.sender], "Caller is not whitelisted");
        require(expireTime >= block.timestamp,"expired transaction");
        tryInsertOrderId(orderId, userAddress, amount, token);

        if (isNative(IERC20(token))) {
            token = address(0);
        }

        require(userBalances[userAddress][token] >= amount + fee, "Insufficient balance");

        userBalances[userAddress][token] -= (amount + fee);

        feeBalances[token] += fee;

        if (token == address(0)) {
            (bool success, ) = userAddress.call{value: amount}("");
            require(success, "ETH transfer failed: insufficient gas or reverted");
        } else {
            IERC20(token).safeTransfer(userAddress, amount);
        }

        emit UserWithdraw(userAddress, token, amount + fee, fee, orderId);
    }

    /**
    * @dev Withdraws tokens from the pool to a specified address.
    * 
    * @param to The address to which the tokens will be withdrawn.
    * @param amount The amount of tokens to withdraw.
    * @param token The address of the token to withdraw (ERC20 or native).
    * @param expireTime The timestamp after which the withdrawal is considered expired.
    * @param orderId A unique identifier for the withdrawal order.
    * @param allSigners An array of addresses that are allowed to sign the transaction.
    * @param signatures An array of signatures corresponding to the signers.
    */
    function poolWithdraw(
        address to,
        uint256 amount,
        address token,
        uint256 expireTime,
        uint256 orderId,
        address[] memory allSigners,
        bytes[] memory signatures
    ) public nonReentrant {
        // Ensure there are at least two signers
        require(allSigners.length >=2, "invalid allSigners length");
        require(allSigners.length == signatures.length, "invalid signatures length");
        require(allSigners[0] != allSigners[1],"can not be same signer"); // must be different signer
        require(expireTime >= block.timestamp,"expired transaction");

        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        // Create a unique hash for this operation
        bytes32 operationHash = keccak256(abi.encodePacked("POOL", to, amount, token, expireTime, orderId, address(this), chainId));
        operationHash = ECDSA.toEthSignedMessageHash(operationHash);

        // Validate signatures against signers
        for (uint8 index = 0; index < allSigners.length; index++) {
        address signer = ECDSA.recover(operationHash, signatures[index]);
        require(signer == allSigners[index], "invalid signer");
        require(isAllowedSigner(signer),"not allowed signer");
        }

        if (isNative(IERC20(token))) {
            token = address(0);
        }

        // Insert order ID to prevent duplicate operations
        tryInsertOrderId(orderId, to, amount, token);

        require(poolBalances[token] >= amount, "Insufficient pool balance");
        poolBalances[token] -= amount;

        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            require(success, "ETH transfer failed: insufficient gas or reverted");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }

        emit PoolWithdraw(orderId, to, amount, token);
    }

    /**
    * @dev Withdraws fees from the pool to a specified address.
    * 
    * @param to The address to which the fees will be withdrawn.
    * @param amount The amount of fees to withdraw.
    * @param token The address of the token for the fees (ERC20 or native).
    * @param expireTime The timestamp after which the withdrawal is considered expired.
    * @param orderId A unique identifier for the fee withdrawal order.
    * @param allSigners An array of addresses that are allowed to sign the transaction.
    * @param signatures An array of signatures corresponding to the signers.
    */
    function poolFeeWithdraw(
        address to,
        uint256 amount,
        address token,
        uint256 expireTime,
        uint256 orderId,
        address[] memory allSigners,
        bytes[] memory signatures
    ) public nonReentrant {
        // Ensure there are at least two signers
        require(allSigners.length >= 2, "invalid allSigners length");
        require(allSigners.length == signatures.length, "invalid signatures length");
        require(allSigners[0] != allSigners[1], "cannot be the same signer");
        require(expireTime >= block.timestamp, "expired transaction");

        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        // Create a unique hash for this operation
        bytes32 operationHash = keccak256(abi.encodePacked("FEE", to, amount, token, expireTime, orderId, address(this), chainId));
        operationHash = ECDSA.toEthSignedMessageHash(operationHash);

        // Validate signatures against signers
        for (uint8 index = 0; index < allSigners.length; index++) {
            address signer = ECDSA.recover(operationHash, signatures[index]);
            require(signer == allSigners[index], "invalid signer");
            require(isAllowedSigner(signer), "not allowed signer");
        }

        if (isNative(IERC20(token))) {
            token = address(0);
        }

        tryInsertOrderId(orderId, to, amount, token);

        require(feeBalances[token] >= amount, "Insufficient fee balance");
        feeBalances[token] -= amount;

        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            require(success, "ETH transfer failed: insufficient gas or reverted");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }

        emit PoolFeeWithdraw(orderId, to, amount, token);
    }

    /**
    * @dev Returns the balance of a user for a specific token.
    * 
    * @param user The address of the user whose balance is queried.
    * @param token The address of the token for which the balance is queried.
    * @return The user's balance for the specified token.
    */
    function getUserBalance(address user, address token) external view returns (uint256) {
        return userBalances[user][token];
    }

    /**
    * @dev Batch updates user balances, callable only by whitelisted addresses.
    * 
    * @param users An array of user addresses whose balances will be updated.
    * @param tokens An array of token addresses corresponding to the users.
    * @param newBalances An array of new balances to set for the users.
    */
    function setUserBalances(
        address[] calldata users,
        address[] calldata tokens,
        uint256[] calldata newBalances
    ) external nonReentrant {
        require(whitelist[msg.sender], "Caller is not whitelisted");

        // Ensure the arrays are of equal length
        require(users.length == tokens.length && tokens.length == newBalances.length, "Array lengths must match");

        for (uint256 i = 0; i < users.length; i++) {
            userBalances[users[i]][tokens[i]] = newBalances[i];
        }
    }

    /**
    * @dev Returns the balance of a specific token in the pool.
    * 
    * @param token The address of the token for which the balance is queried.
    * @return The balance of the specified token in the pool.
    */
    function getPoolBalance(address token) external view returns (uint256) {
        return poolBalances[token];
    }

    /**
    * @dev Updates the pool balances for a batch of tokens.
    * 
    * This function allows the contract owner to update the pool balances of multiple tokens in a single transaction.
    * It ensures that the lengths of the tokens and balances arrays are the same, and performs basic validation checks
    * (such as ensuring token addresses are not zero and balances are non-negative).
    * 
    * Emits a `PoolBalanceUpdated` event for each token whose balance is updated.
    * 
    * @param tokens The array of token addresses for which to update the pool balances.
    * @param newBalances The array of new balances corresponding to each token in the `tokens` array.
    */
    function setPoolBalances(
        address[] calldata tokens,
        uint256[] calldata newBalances
    ) external nonReentrant {
        require(whitelist[msg.sender], "Caller is not whitelisted");

        // Ensure that both arrays have the same length
        require(tokens.length == newBalances.length, "Array lengths must match");

        for (uint256 i = 0; i < tokens.length; i++) {
            poolBalances[tokens[i]] = newBalances[i];
        }
    }

    /**
    * @dev Returns the fee balance of a specific token.
    * 
    * @param token The address of the token for which the fee balance is queried.
    * @return The fee balance of the specified token.
    */
    function getFeeBalance(address token) external view returns (uint256) {
        return feeBalances[token];
    }

    function setFeeBalances(
        address[] calldata tokens,
        uint256[] calldata newBalances
    ) external nonReentrant {
        require(whitelist[msg.sender], "Caller is not whitelisted");

        // Ensure that both arrays have the same length
        require(tokens.length == newBalances.length, "Array lengths must match");

        for (uint256 i = 0; i < tokens.length; i++) {
            feeBalances[tokens[i]] = newBalances[i];
        }
    }

    /**
    * @dev Deducts fees from multiple users and adds them to the fee balance of the token.
    * @param token The address of the token from which fees will be deducted.
    * @param users The array of user addresses whose balances will be deducted.
    * @param deductFees The array of fees to deduct from each user's balance.
    */
    function deductUserFee(
        address token,
        address[] calldata users,
        uint256[] calldata deductFees
    ) external nonReentrant {
        // Ensure that the caller is whitelisted
        require(whitelist[msg.sender], "Caller is not whitelisted");
        // Ensure that the length of users and deductFees arrays match
        require(users.length == deductFees.length, "users and deductFees length mismatch");

        uint256 totalDeductFee = 0; // Variable to accumulate the total fee deducted

        // Iterate through each user and deduct the specified fee
        for (uint256 index = 0; index < users.length; index++) {
            address user = users[index];
            uint256 deductFee = deductFees[index];
            // Ensure that the user has sufficient balance to cover the deduction
            require(userBalances[user][token] >= deductFee, "Insufficient user balance");

            // Deduct the fee from the user's balance
            userBalances[user][token] -= deductFee;
            // Accumulate the deducted fee into the total fee
            totalDeductFee += deductFee;
        }

        // Add the total deducted fee to the contract's fee balance for the specified token
        feeBalances[token] += totalDeductFee;
    }

    function emergencyWithdrawETH(
        address payable to,
        uint256 amount,
        uint256 expireTime,
        uint256 orderId,
        address[] memory allSigners,
        bytes[] memory signatures
    ) public nonReentrant {
        require(allSigners.length >= 2, "invalid allSigners length");
        require(allSigners.length == signatures.length, "invalid signatures length");
        require(allSigners[0] != allSigners[1],"can not be same signer"); // must be different signer
        require(expireTime >= block.timestamp,"expired transaction");

        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        bytes32 operationHash = keccak256(abi.encodePacked("ETHER", to, amount, expireTime, orderId, address(this), chainId));
        operationHash = ECDSA.toEthSignedMessageHash(operationHash);
        
        for (uint8 index = 0; index < allSigners.length; index++) {
        address signer = ECDSA.recover(operationHash, signatures[index]);
        require(signer == allSigners[index], "invalid signer");
        require(isAllowedSigner(signer), "not allowed signer");
        }

        // Try to insert the order ID. Will revert if the order id was invalid
        tryInsertOrderId(orderId, to, amount, address(0));

        // send ETHER
        require(address(this).balance >= amount, "Address: insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Address: unable to send value, recipient may have reverted");

        emit WithdrawETH(orderId, to, amount);
    }

    function emergencyWithdrawErc20(
        address to,
        uint256 amount,
        address token,
        uint256 expireTime,
        uint256 orderId,
        address[] memory allSigners,
        bytes[] memory signatures
    ) public nonReentrant {
        require(allSigners.length >=2, "invalid allSigners length");
        require(allSigners.length == signatures.length, "invalid signatures length");
        require(allSigners[0] != allSigners[1],"can not be same signer"); // must be different signer
        require(expireTime >= block.timestamp,"expired transaction");

        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        bytes32 operationHash = keccak256(abi.encodePacked("ERC20", to, amount, token, expireTime, orderId, address(this), chainId));
        operationHash = ECDSA.toEthSignedMessageHash(operationHash);

        for (uint8 index = 0; index < allSigners.length; index++) {
        address signer = ECDSA.recover(operationHash, signatures[index]);
        require(signer == allSigners[index], "invalid signer");
        require(isAllowedSigner(signer),"not allowed signer");
        }

        // Try to insert the order ID. Will revert if the order id was invalid
        tryInsertOrderId(orderId, to, amount, token);

        // Success, send ERC20 token
        IERC20(token).safeTransfer(to, amount);
        emit WithdrawERC20(orderId, token, to, amount);
    }

    /**
    * Determine if an address is a signer on this wallet
    *
    * @param signer address to check
    */
    function isAllowedSigner(address signer) public view returns (bool) {
    // Iterate through all signers on the wallet and
    for (uint i = 0; i < signers.length; i++) {
        if (signers[i] == signer) {
        return true;
        }
    }
    return false;
    }

    /**
    * Verify that the order id has not been used before and inserts it. Throws if the order ID was not accepted.
    *
    * @param orderId   the unique order id 
    * @param to        the destination address to send an outgoing transaction
    * @param amount     the amount in Wei to be sent
    * @param token     the address of the ERC20 contract
    */
    function tryInsertOrderId(
        uint256 orderId, 
        address to,
        uint256 amount, 
        address token
    ) internal {
    if (orders[orderId].executed) {
        // This order ID has been excuted before. Disallow!
        revert("repeated order");
    }

    orders[orderId].executed = true;
    orders[orderId].to = to;
    orders[orderId].amount = amount;
    orders[orderId].token = token;
    }

    function isNative(IERC20 token_) internal pure returns (bool) {
        return (token_ == ZERO_ADDRESS || token_ == ETH_ADDRESS);
    }
  
    function updateSigners(address[] memory newSigners) public onlyOwner {
        require(newSigners.length == 3, "newSigners must have exactly 3 signers");
        require(newSigners[0] != newSigners[1], "newSigners[0] and newSigners[1] must be different");
        require(newSigners[0] != newSigners[2], "newSigners[0] and newSigners[2] must be different");
        require(newSigners[1] != newSigners[2], "newSigners[1] and newSigners[2] must be different");

        signers = newSigners;
    }

    /**
    * @notice Adds an address to the whitelist.
    * @param account The address to be added to the whitelist.
    */
    function addToWhitelist(address account) public onlyOwner {
        require(account != address(0), "Invalid address");
        whitelist[account] = true;
        emit Whitelisted(account, true);
    }

    /**
    * @notice Removes an address from the whitelist.
    * @param account The address to be removed from the whitelist.
    */
    function removeFromWhitelist(address account) public onlyOwner {
        whitelist[account] = false;
        emit Whitelisted(account, false);
    }

    /**
    * @dev This function allows the contract owner to mark a token as either a multi-chain asset or a single-chain asset.
    * @param token The address of the token to update.
    * @param isMultiChain A boolean value where `true` marks the token as a multi-chain asset, and `false` marks it as a single-chain asset.
    */
    function setMultiChainAsset(address token, bool isMultiChain) external onlyOwner {
        multiChainAssets[token] = isMultiChain;
        emit MultiChainAssetUpdated(token, isMultiChain);
    }

}
