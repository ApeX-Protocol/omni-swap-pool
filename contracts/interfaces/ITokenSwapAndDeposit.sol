// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITokenSwapAndDeposit {
    function deposit(
        address _token,
        uint256 _amount,
        bytes32 _zkLinkAddress,
        bytes calldata _exchangeData
    ) external payable returns (uint256);

    function depositETH(
        address _token,
        uint256 _amount,
        bytes32 _zkLinkAddress,
        bytes calldata _exchangeData
    ) external payable returns (uint256);
}
