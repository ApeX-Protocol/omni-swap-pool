// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";
import "../interfaces/IAggregationRouterV5.sol";

contract MockAggregationRouterV5 {
    using SafeERC20 for IERC20;
    // 乘以一个因子（如10^6），用于处理小数
    uint256 constant SCALE = 10**6;
    uint256 constant BIGSCALE = 10**5;
    IERC20 private constant ETH_ADDRESS = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    IERC20 private constant ZERO_ADDRESS = IERC20(address(0));

    struct SwapDescription {
        IERC20 srcToken;
        IERC20 dstToken;
        address payable srcReceiver;
        address payable dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
        // 测试模拟1inch时放开这个参数
        // uint256 exchangeRate;
    }

    // Swap function to support ETH -> ERC20, ERC20 -> ETH, ERC20 -> ERC20
    function swap(
        address caller,
        SwapDescription calldata desc,
        bytes calldata extraData
    ) external payable returns (uint256, uint256) {
        console.log("swap.start");

        uint256 returnAmount;
        // Record initial balances
        uint256 initialSrcBalance = isNative(desc.srcToken) ? address(this).balance : desc.srcToken.balanceOf(address(this));
        uint256 initialDstBalance = isNative(desc.dstToken) ? address(this).balance : desc.dstToken.balanceOf(address(this));
        
        // Case 1: ETH -> ERC20
        if (isNative(desc.srcToken) && !isNative(desc.dstToken)) {
            require(msg.value == desc.amount, "ETH amount mismatch");
            console.log("ETH received1: ", msg.value);

            IERC20 dstToken = IERC20(desc.dstToken);
            uint256 dstBalance = dstToken.balanceOf(address(this));
            console.log("dstBalance1: ", dstBalance);
            // returnAmount = calculateRate(address(desc.srcToken), address(desc.dstToken), msg.value);
            returnAmount = desc.minReturnAmount;
            console.log("returnAmount1: ", returnAmount);
            require(dstBalance >= returnAmount, "Not enough dstToken in contract");
            dstToken.safeTransfer(desc.dstReceiver, returnAmount);

        // Case 2: ERC20 -> ETH
        } else if (!isNative(desc.srcToken) && isNative(desc.dstToken)) {
            IERC20 srcToken = IERC20(desc.srcToken);

            // Transfer srcToken from the sender to this contract
            srcToken.safeTransferFrom(desc.dstReceiver, address(this), desc.amount);
            uint256 srcBalance = srcToken.balanceOf(address(this));
            console.log("ERC20 srcBalance2: ", srcBalance);

            // returnAmount = calculateRate(address(desc.srcToken), address(desc.dstToken), desc.amount);
            returnAmount = desc.minReturnAmount;
            console.log("returnAmount2: ", returnAmount);
            require(address(this).balance >= returnAmount, "Not enough ETH in contract");
            (bool sent, ) = desc.dstReceiver.call{value: returnAmount}("");
            require(sent, "Failed to send ETH");

        // Case 3: ERC20 -> ERC20
        } else if (!isNative(desc.srcToken) && !isNative(desc.dstToken)) {
            IERC20 srcToken = IERC20(desc.srcToken);
            IERC20 dstToken = IERC20(desc.dstToken);

            // Transfer srcToken from the sender to this contract
            srcToken.safeTransferFrom(desc.dstReceiver, address(this), desc.amount);
            uint256 srcBalance = srcToken.balanceOf(address(this));
            console.log("ERC20 srcBalance3: ", srcBalance);

            uint256 dstBalance = dstToken.balanceOf(address(this));
            console.log("ERC20 dstBalance3: ", dstBalance);
            // returnAmount = calculateRate(address(desc.srcToken), address(desc.dstToken), desc.amount);
            returnAmount = desc.minReturnAmount;
            console.log("returnAmount3: ", returnAmount);
            require(dstBalance >= returnAmount, "Not enough dstToken in contract");
            dstToken.safeTransfer(desc.dstReceiver, returnAmount);

        } else {
            revert("Invalid token combination for swap");
        }

        // Record final balances
        uint256 finalSrcBalance = isNative(desc.srcToken) ? address(this).balance : desc.srcToken.balanceOf(address(this));
        uint256 finalDstBalance = isNative(desc.dstToken) ? address(this).balance : desc.dstToken.balanceOf(address(this));

        // Print initial and final balances
        console.log("Initial Src Balance:", initialSrcBalance);
        console.log("Final Src Balance:", finalSrcBalance);
        console.log("Initial Dst Balance:", initialDstBalance);
        console.log("Final Dst Balance:", finalDstBalance);

        console.log("MockAggregationRouterV5.amount:", desc.amount);
        console.log("MockAggregationRouterV5.returnAmount:", returnAmount);
        console.log("MockAggregationRouterV5.end");

        return (returnAmount, desc.amount);
    }

    // Helper function to calculate rate based on address comparison using uint160
    function calculateRate(
        address srcToken,
        address dstToken,
        uint256 amount
    ) internal pure returns (uint256) {
        // Convert addresses to uint160 for comparison
        uint160 srcTokenInt = uint160(srcToken);
        uint160 dstTokenInt = uint160(dstToken);

        if (srcTokenInt < dstTokenInt) {
            // srcToken < dstToken, so we multiply the amount by 2 (e.g., 1:2 rate)
            console.log("1:2 rate");
            return (amount * 2);
        } else {
            // srcToken > dstToken, so we divide the amount by 2 (e.g., 2:1 rate)
            console.log("2:1 rate");
            return (amount / 2);
        }
    }

    // Helper function to check if a token address is the native token (ETH)
    function isNative(IERC20 token_) internal pure returns (bool) {
        return (token_ == ZERO_ADDRESS || token_ == ETH_ADDRESS);
    }

    // Fallback function to accept ETH
    receive() external payable {}

    // Function to allow anyone to withdraw ETH from the contract
    function withdrawETH(uint256 amount) external {
        require(address(this).balance >= amount, "Insufficient ETH balance");
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Failed to withdraw ETH");
    }

    // Function to allow anyone to withdraw ERC20 tokens from the contract
    function withdrawERC20(IERC20 token, uint256 amount) external {
        require(token.balanceOf(address(this)) >= amount, "Insufficient token balance");
        token.safeTransfer(msg.sender, amount);
    }
 
}

