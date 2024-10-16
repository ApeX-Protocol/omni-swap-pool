// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";
import "../interfaces/IAggregationRouterV4.sol";

contract MockAggregationRouterV4 {
    using SafeERC20 for IERC20;

    struct SwapDescription {
        IERC20 srcToken;
        IERC20 dstToken;
        address payable srcReceiver;
        address payable dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
        bytes permit;
    }

    function swap(
        address caller,
        IAggregationRouterV4.SwapDescription calldata desc,
        bytes calldata extraData
    ) external returns (uint256, uint256) {
        console.log("swap.start");
        IERC20 srcToken = IERC20(desc.srcToken);
        IERC20 dstToken = IERC20(desc.dstToken);

        // Transfer srcToken from desc.dstReceiver to this contract
        srcToken.safeTransferFrom(desc.dstReceiver, address(this), desc.amount);

        // Check if the contract has enough dstToken balance
        uint256 dstBalance = dstToken.balanceOf(address(this));
        uint256 srcBalance = srcToken.balanceOf(address(this));
        console.log("swap.srcBalance: ",srcBalance);
        console.log("swap.dstBalance: ",dstBalance);
        require(dstBalance >= desc.minReturnAmount, "Not enough dstToken in contract");

        // Transfer dstToken to desc.dstReceiver
        dstToken.safeTransfer(desc.dstReceiver, desc.amount * 2); // Assuming 1:2 swap

        uint256 returnAmount = desc.amount * 2;
        console.log("swap.amount:",desc.amount);
        console.log("swap.returnAmount:",returnAmount);
        console.log("swap.end");
        
        return (returnAmount,desc.amount);
    }
}
