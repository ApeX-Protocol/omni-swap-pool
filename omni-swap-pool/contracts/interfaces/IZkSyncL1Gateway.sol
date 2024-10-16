// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IZkSyncL1Gateway {
    function depositERC20(
        address _token,
        // uint256 _amount,
        uint104 _amount,
        bytes32 _zkLinkAddress,
        uint8 _subAccountId,
        bool _mapping
    ) external payable;

    /**
     * @notice Deposit ETH to zkSync from L1.
     * @param _zkLinkAddress The zkLink address to deposit to.
     * @param _subAccountId The sub-account ID on zkSync.
     */
    function depositETH(
        bytes32 _zkLinkAddress,
        uint8 _subAccountId
    ) external payable;
    
}
