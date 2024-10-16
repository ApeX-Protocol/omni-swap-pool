// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./IAggregationExecutorV5.sol";

interface IAggregationRouterV5 {
    struct SwapDescription {
      IERC20 srcToken;
      IERC20 dstToken;
      address payable srcReceiver;
      address payable dstReceiver;
      uint256 amount;
      uint256 minReturnAmount;
      uint256 flags;
    //   uint256 exchangeRate;
    }

   function swap(
        IAggregationExecutor executor,
        SwapDescription calldata desc,
        bytes calldata permit,
        bytes calldata data
    )
        external
        payable
        returns (
            uint256 returnAmount,
            uint256 spentAmount
        );
}