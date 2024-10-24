# Audit Document
## 1. Overview

**Contract Name**: L1Pool  
**Contract Address**: (Pending Deployment)  
**Audit Objectives**: Ensure the security of the contract, the correctness of the functionality, logical consistency, and avoid common security vulnerabilities, such as reentrancy attacks and permission management issues.  

**Core Functionality of the L1Pool Contract**:  
The core function of the L1Pool contract is to help users conduct cross-chain spot trading and provide fund advances to accelerate the trading process. Users can use the L1Pool contract to quickly exchange their assets between the L1 chain and the L2 chain. The contract supports cross-chain trading, fee management, user and pool balance management, as well as emergency withdrawal functions.

---

## 2. Contract Design Goals

The design goal of the L1Pool contract is to provide users with a fast spot trading service, especially for cross-chain asset exchange between L2 and L1. Through this contract, users can achieve the following features:

1. **Fast Cross-Chain Trading and Asset Transfer**:
    - **`swapFromPool` Function**: Users can use the `swapFromPool` interface to quickly exchange assets on the L2 chain for assets on the L1 chain. The contract uses funds pre-advanced from the pool to help users complete the exchange and stores the exchanged target assets in the user's `userBalances`. This greatly accelerates the cross-chain trading process, allowing users to immediately obtain the target assets on L1 without waiting for the actual cross-chain transfer.

    - **`swapFromUser` Function**: Users can use the `swapFromUser` interface to exchange tokens on the L1 chain. This operation does not involve cross-chain logic and allows users to flexibly exchange assets on L1 and store the exchanged tokens in `userBalances`. This function is suitable for users who want to complete asset swaps on the L1 chain.

    - **`omniTransferToSpot` Function**: This interface allows users to transfer L1 chain assets to the zkLink L2 network. Through this function, users can transfer L1 assets in the L1Pool contract to the `spot` account on L2 via the zkLink gateway, thereby continuing to use their assets on the L2 network.

2. **User Asset Management**:
   - User assets are stored in `userBalances`. Users can exchange between different tokens through the contract or withdraw assets from L1Pool to their wallets using the withdrawal function. The contract provides multiple interfaces to help users flexibly manage their assets on both L1 and L2.

3. **Fee Management**:
   - Fees collected during user transactions are stored in `feeBalances`. Each transaction (such as `swapFromPool` or `swapFromUser`) deducts a certain fee, which is recorded in this mapping. The contract manager can extract these fees through a dedicated interface.

4. **Multi-Chain Asset Management**:
   - The `multiChainAssets` mapping records which tokens are multi-chain assets and which are single-chain assets. Multi-chain assets exist across multiple blockchain networks and require special handling logic. For example, when a user uses multi-chain assets, the contract determines whether to update the user's balance or the pool balance based on the type of asset.

5. **Whitelist Control**:
   - The contract strictly controls permissions for sensitive operations through a `whitelist`. Only authorized whitelist accounts can call interfaces involving fund operations, such as `swapFromPool`, `userWithdraw`, and `setUserBalances`. This mechanism ensures that only trusted accounts can operate funds in the contract, enhancing its security.

### Key Variable Explanations:
1. **`poolBalances`**: Records the amount of funds advanced by the contract manager in the L1Pool contract.
2. **`userBalances`**: Records the assets deposited by users into the L1Pool contract through `swap` transactions.
3. **`feeBalances`**: Records the fee balance for each type of token.
4. **`multiChainAssets`**: Records which tokens are multi-chain assets and which are single-chain assets. Multi-chain assets require special handling.
5. **`whitelist`**: Records users on the whitelist who are allowed to call specific interfaces.

---

### 3. Core Interface Descriptions

#### 3.1 `depositToPool` Interface Functionality
- **Function**: The contract manager uses this interface to inject funds into the `L1Pool` contract. The funds are recorded in `poolBalances` to provide liquidity for users' future `swap` transactions.
- **Input**:
  - `address token`: The address of the token to be deposited. If it is ETH, pass `address(0)`.
  - `uint256 amount`: The amount of tokens to be deposited. For ETH deposits, this parameter is ignored, and `msg.value` is used.
- **Logic**:
  1. If `token` is the native token (e.g., ETH), then `msg.value > 0` is required, and the ETH balance is increased in `poolBalances[address(0)]`.
  2. If `token` is an ERC20 token, ensure `amount > 0` and `msg.value == 0`, then use `safeTransferFrom` to transfer the ERC20 tokens to the contract and add them to `poolBalances`.
- **Output**: No direct return value. Emits a `DepositToPool` event to record the deposit operation.
- **Security Considerations**: 
  - The contract strictly distinguishes between ETH and ERC20 deposits to prevent confusion.
  - Uses `safeTransferFrom` to ensure the secure transfer of ERC20 tokens.

#### 3.2 `swapFromPool` Interface Functionality
- **Function**: Users can use this interface to exchange tokens held on L2 (zkLink) into target tokens on L1, using the liquidity provided by the `L1Pool` contract for a quick L2 to L1 swap.
- **Input**:
  - `address token`: The source token address that the user wishes to swap (can be ETH or ERC20).
  - `uint256 amount`: The amount of the source token to be swapped.
  - `address routerAddress`: The address of the router contract that will execute the swap.
  - `bytes calldata exchangeData`: Encoded data containing the swap details.
  - `address user`: The address of the user performing the swap.
  - `uint256 fee`: The fee charged for this transaction, recorded in `feeBalances`.
- **Logic**:
  1. Verify `whitelist` to ensure the caller has permission.
  2. Check if `poolBalances[token]` has sufficient balance to cover `amount + fee`.
  3. Handle the source and target token types (native/ ERC20):
     - If the source token is ETH, call `routerAddress.call{value: amount}` to perform the swap.
     - If it is an ERC20 token, approve it via `safeApprove` and then call `routerAddress` for the swap.
  4. Decode the swap result using `abi.decode`, verify the returned target token amount, and increase `userBalances[user]` by the target token amount.
  5. Record the fee to `feeBalances`.
- **Output**: Returns `returnAmount`, which is the amount of the target token obtained by the user after the swap. Emits a `SwapFromPool` event.
- **Security Considerations**:
  - Control permissions using `whitelist`.
  - Ensure `poolBalances` is sufficient before executing the swap.
  - Use `safeApprove` to authorize ERC20 transfers securely, preventing token theft.

#### 3.3 `swapFromUser` Interface Functionality
- **Function**: Users can use this interface to exchange tokens on L1 (purely L1 operations without cross-chain logic).
- **Input**:
  - `address token`: The source token address the user wishes to swap (can be ETH or ERC20).
  - `uint256 amount`: The amount of the source token to be swapped.
  - `address routerAddress`: The address of the router contract that will execute the swap.
  - `bytes calldata exchangeData`: Encoded data containing the swap details.
  - `address user`: The address of the user performing the swap.
  - `uint256 fee`: The fee charged for this transaction, recorded in `feeBalances`.
- **Logic**:
  1. Verify `whitelist` to ensure the caller has permission.
  2. Check if `userBalances[user][token]` is sufficient to cover `amount + fee`.
  3. Deduct `amount + fee` from the user's balance.
  4. Call `routerAddress` using `exchangeData` to perform the swap and parse the result.
  5. Use `multiChainAssets` to determine whether the target token is a multi-chain asset:
     - If it is a multi-chain asset, increase `poolBalances`.
     - If it is a single-chain asset, increase `userBalances[user]`.
  6. Record the fee in `feeBalances`.
- **Output**: Returns `returnAmount`, which is the amount of the target token obtained by the user (after deducting the fee). Emits a `SwapFromUser` event.
- **Security Considerations**:
  - Control permissions using `whitelist`.
  - Ensure the user has sufficient token balance.
  - Use `safeApprove` to authorize ERC20 transfers securely, preventing token theft.

#### 3.4 `omniTransferToSpot` Interface Functionality
- **Function**: Users can use this interface to transfer assets from their `omni` account to their `spot` account (L1 to L2 zkLink transfer).
- **Input**:
  - `address token`: The token address the user wishes to transfer (can be ETH or ERC20).
  - `uint256 amount`: The amount of the token to be transferred.
  - `bytes32 zkLinkAddress`: The user's `zkLink` address.
  - `address user`: The address of the user performing the transfer.
  - `uint256 fee`: The fee charged for the transfer.
- **Logic**:
  1. Verify `whitelist` to ensure the caller has permission.
  2. Check if `userBalances[user][token]` is sufficient to cover `amount + fee`.
  3. Deduct the user's token balance and record the fee in `feeBalances`.
  4. Call `ZK_SYNC_L1_GATEWAY_ADDRESS` to transfer the token from L1 to L2:
     - If it is ETH, call `depositETH`.
     - If it is an ERC20 token, approve it via `safeApprove` and then call `depositERC20`.
- **Output**: No direct return value. Emits an `OmniTransferToSpot` event to record the transfer operation.
- **Security Considerations**:
  - Control permissions using `whitelist`.
  - Ensure the user has sufficient token balance.
  - Use `safeApprove` to authorize ERC20 transfers securely.

#### 3.5 `userWithdraw` Interface Functionality
- **Function**: Users can use this interface to withdraw their deposited tokens from the L1Pool contract.
- **Input**:
  - `address userAddress`: The address of the user.
  - `address token`: The token address the user wishes to withdraw (ETH or ERC20).
  - `uint256 amount`: The amount of tokens to be withdrawn.
  - `uint256 fee`: The fee to be deducted during the withdrawal.
- **Logic**:
  1. Verify `whitelist` to ensure the caller has permission.
  2. Check if `userBalances[userAddress][token]` is sufficient to cover `amount + fee`.
  3. Deduct the user's token balance and record the fee in `feeBalances`.
  4. If it is ETH, send ETH to the user address using `call`.
  5. If it is an ERC20 token, use `safeTransfer` to send the tokens to the user.
- **Output**: No direct return value. Emits a `UserWithdraw` event to record the withdrawal operation.
- **Security Considerations**:
  - Ensure the user has sufficient token balance to prevent over-withdrawing.
  - Use `safeTransfer` to securely transfer ERC20 tokens, preventing loss.

#### 3.6 `poolWithdraw` Interface Functionality
- **Function**: The contract manager can use this interface to withdraw funds from the `L1Pool` contract.
- **Input**:
  - `address to`: The target address for the withdrawal.
  - `uint256 amount`: The amount of tokens to be withdrawn.
  - `address token`: The address of the token to be withdrawn.
  - `uint256 expireTime`: The expiration time for the withdrawal request.
  - `uint256 orderId`: A unique order ID for the withdrawal.
  - `address[] memory allSigners`: List of signers participating in the multi-signature.
  - `bytes[] memory signatures`: List of signatures corresponding to the signers.
- **Logic**:
  1. Verify the validity of the signers and signatures to ensure at least two different signers approve the withdrawal.
  2. Confirm the order ID has not been used, preventing duplicate withdrawals.
  3. Check if `poolBalances[token]` has sufficient balance to cover the withdrawal amount.
  4. If it is ETH, send ETH to the target address using `call`.
  5. If it is an ERC20 token, use `safeTransfer` to send the tokens to the target address.
- **Output**: No direct return value. Emits a `PoolWithdraw` event to record the withdrawal operation.
- **Security Considerations**:
  - Ensure the withdrawal is verified by multiple signatures and the order ID is unique to avoid duplicate withdrawals.
  - Use `safeTransfer` and `call` for secure fund transfers.

#### 3.7 `poolFeeWithdraw` Interface Functionality
- **Function**: The contract manager can use this interface to withdraw accumulated fees from the L1Pool contract.
- **Input**:
  - `address to`: The target address for the fee withdrawal.
  - `uint256 amount`: The amount of fees to be withdrawn.
  - `address token`: The address of the token for the fees.
  - `uint256 expireTime`: The expiration time for the withdrawal request.
  - `uint256 orderId`: A unique order ID for the fee withdrawal.
  - `address[] memory allSigners`: List of signers participating in the multi-signature.
  - `bytes[] memory signatures`: List of signatures corresponding to the signers.
- **Logic**:
  1. Verify the validity of the signers and signatures.
  2. Confirm the order ID has not been used.
  3. Check if `feeBalances[token]` has sufficient balance.
  4. Transfer the fee balance to the target address.
- **Output**: No direct return value. Emits a `PoolFeeWithdraw` event.
- **Security Considerations**:
  - Similar to `poolWithdraw`, ensure the withdrawal is verified by multiple signatures and the order ID is unique.

#### 3.8 `emergencyWithdrawETH` Interface Functionality
- **Function**: Users can use this interface to withdraw deposited ETH from the contract in an emergency.
- **Input**:
  - `address payable to`: The target address for the withdrawal.
  - `uint256 amount`: The amount of ETH to be withdrawn.
  - `uint256 expireTime`: The expiration time for the withdrawal request.
  - `uint256 orderId`: A unique order ID for the withdrawal.
  - `address[] memory allSigners`: List of signers participating in the multi-signature.
  - `bytes[] memory signatures`: List of signatures corresponding to the signers.
- **Logic**:
  1. Verify the validity of the signers and signatures to ensure at least two different signers approve the withdrawal.
  2. Confirm the order ID has not been used, preventing duplicate withdrawals.
  3. Check if the contract has sufficient ETH balance.
  4. Send ETH to the target address using `call`.
- **Output**: No direct return value. Emits a `WithdrawETH` event.
- **Security Considerations**:
  - Multi-signature verification ensures the security of emergency withdrawals.
  - Verify the order ID to prevent duplicate withdrawals.
  - Use `call` to securely transfer ETH, preventing failed transfers.

#### 3.9 `emergencyWithdrawERC20` Interface Functionality
- **Function**: Users can use this interface to withdraw deposited ERC20 tokens from the contract in an emergency.
- **Input**:
  - `address to`: The target address for the withdrawal.
  - `uint256 amount`: The amount of ERC20 tokens to be withdrawn.
  - `address token`: The address of the ERC20 token.
  - `uint256 expireTime`: The expiration time for the withdrawal request.
  - `uint256 orderId`: A unique order ID for the withdrawal.
  - `address[] memory allSigners`: List of signers participating in the multi-signature.
  - `bytes[] memory signatures`: List of signatures corresponding to the signers.
- **Logic**:
  1. Verify the validity of the signers and signatures to ensure at least two different signers approve the withdrawal.
  2. Confirm the order ID has not been used, preventing duplicate withdrawals.
  3. Check if `poolBalances[token]` has sufficient ERC20 balance.
  4. Use `safeTransfer` to send the ERC20 tokens to the target address.
- **Output**: No direct return value. Emits a `WithdrawERC20` event.
- **Security Considerations**:
  - Multi-signature verification ensures the security of emergency withdrawals.
  - Verify the order ID to prevent duplicate withdrawals.
  - Use `safeTransfer` to securely transfer ERC20 tokens, preventing token loss.

---

## 4. Security Considerations

### 4.1 Reentrancy Attack Prevention
- The contract uses `ReentrancyGuard` to prevent reentrancy attacks. All functions involving external calls are marked with the `nonReentrant` modifier.

### 4.2 Multisignature Verification
- All operations involving multisignature rely on `ECDSA` signature verification to ensure that only authorized accounts can execute these operations.
- Each multisignature operation generates a unique hash, which is verified to confirm that the signers belong to the `signers` list.

### 4.3 Access Control
- The `whitelist` mechanism ensures that only whitelisted accounts can invoke sensitive operations, such as batch balance modifications, withdrawals, etc.
- Only the contract owner can modify the whitelist, ensuring secure access control.

### 4.4 Asset Security
- User and contract manager assets are stored in different variables (`userBalances` and `poolBalances`), with a clear distinction. The contract checks balances before each withdrawal or swap operation to prevent actions exceeding available funds.

---

## 5. Deployment and Environment Configuration

### 5.1 Contract Deployment Guide

Deploying the L1Pool contract requires considering the following steps:

1. **Environment Preparation**:
   - Use Hardhat for contract development, compilation, and deployment.
   - Before deployment, ensure that the network configuration is correct, such as the RPC node settings. Make sure to have a `.env` file to store sensitive information (e.g., private keys and Infura API keys).

2. **Deployment Steps**:
   1. **Compile the Contract**: The deployment script can refer to the `scripts/deployL1Pool.js` file, and the verification script can refer to `verifyL1Pool.js`. Use `npm run compile` or `npx hardhat compile` to compile the contract and ensure there are no syntax or compilation errors.
   2. **Configure Deployment Parameters**:
      - Set up the contract constructor parameters, such as allowed signers (`allowedSigners`), initial whitelist (`initialWhitelist`), zkSync L1 Gateway address (`zkSyncL1Gateway`), and USDT address (`usdtAddress`).
   3. **Execute Deployment**: Deploy the contract to the specific network (e.g., Goerli testnet or mainnet) using the deployment script (e.g., `npm run deploy` or `npx hardhat run scripts/deploy.js --network goerli`).

3. **Post-Deployment Verification**:
   - After successful deployment, verify the contract code using Etherscan or another blockchain explorer. This can be automated by running `npm run verify`.
   - Test the basic functions of the contract by calling key methods (such as `depositToPool` and `swapFromPool`) to ensure the behavior is as expected.

### 5.2 Environment Configuration

To successfully compile, deploy, and run the L1Pool contract, the following development environment is required:

1. **Node.js Version**: `v16.x` or higher, it is recommended to use a stable version to ensure compatibility.
2. **NPM Version**: `v7.x` or higher, or use Yarn (`v1.22.x` or higher).
3. **Ethers.js Version**: `v5.6.5`, used for interacting with the Ethereum network.
4. **Solidity Compiler Version**: The contract is written in Solidity `^0.8.0`, ensure the compiler version in Hardhat matches this.
5. **Other Dependencies**:
   - **Hardhat**: Used as the Solidity development environment, install Hardhat (`npm install --save-dev hardhat`).
   - **OpenZeppelin Libraries**: The contract uses OpenZeppelin libraries (`@openzeppelin/contracts`) to implement token standards, access control, and other functionalities.
   - **Hardhat Plugins**:
     - `@nomiclabs/hardhat-ethers` and `@nomiclabs/hardhat-waffle` for contract compilation and testing.
     - `@nomiclabs/hardhat-etherscan` for post-deployment contract verification.
     - `hardhat-deploy` for enhanced support of deployment scripts.
     - `hardhat-gas-reporter` for reporting gas usage of contract calls.
     - `solidity-coverage` for generating code coverage reports of the contract.
   - **Testing Libraries**:
     - **Chai**: Used for writing contract test assertions (`chai` library).
     - **Ethereum Waffle**: A testing framework for smart contracts (`ethereum-waffle` library).
   - **Other Libraries**:
     - **MerkleTreeJS**: Used for creating and verifying Merkle trees.
     - **dotenv**: Used for loading environment variables from `.env` files.

### 5.3 Installing Dependencies

```sh
# Install Node.js environment
nvm install 16
nvm use 16

# Initialize the project and install dependencies
# If there is already a yarn.lock file, run the following command to install all dependencies
yarn install
```

### 5.4 Configuring the .env File

Create a `.env` file to store private keys, RPC node URLs, and other sensitive information.

```env
INFURA_API_KEY=your_infura_api_key
PRIVATE_KEY=your_private_key
NETWORK=mainnet # or goerli/polygon, etc.
```

### 5.5 Deployment Script Example

```js
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const L1Pool = await hre.ethers.getContractFactory("L1Pool");
  const l1Pool = await L1Pool.deploy(
    ["0xSigner1", "0xSigner2", "0xSigner3"], // allowedSigners
    ["0xWhitelist1", "0xWhitelist2"], // initialWhitelist
    "0xZkSyncGatewayAddress", // zkSync L1 Gateway
    "0xUSDTAddress" // USDT token address
  );

  await l1Pool.deployed();
  console.log("L1Pool deployed to:", l1Pool.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```
---

## 6. Conclusion

The L1Pool contract is designed to provide users with cross-chain trading and spot exchange services, involving core functionalities such as multisignature management, whitelist management, cross-chain asset handling, and pool management. The contract uses multisignature mechanisms and whitelists to protect critical operations, ensuring operational security. To maintain system robustness, multiple protection measures are introduced, such as reentrancy protection and token authorization control. The audit team is recommended to thoroughly review the following aspects:
- Reentrancy attack protection
- Signature verification of the multisignature mechanism
- Security of asset management
- Proper handling of multi-chain assets

The audit team is requested to analyze the potential risks and vulnerabilities according to the contract's functionality and design, ensuring the security and reliability of the contract.



