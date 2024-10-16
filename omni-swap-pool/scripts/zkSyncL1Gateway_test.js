const hre = require("hardhat");

// 执行命令  npx hardhat run scripts/zkSyncL1Gateway_test.js --network bscTestnet
async function main() {
  const signers = await hre.ethers.getSigners();
  const account = signers[0];
  console.log(`Address: ${account.address}`);

  const contract = new hre.ethers.Contract("0x3145BEf9A28BB7c348bCE8EB341ed21Cd34956e3", [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_periphery",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "acceptor",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint128",
          "name": "amount",
          "type": "uint128"
        },
        {
          "indexed": false,
          "internalType": "uint16",
          "name": "withdrawFeeRate",
          "type": "uint16"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "accountIdOfNonce",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "subAccountIdOfNonce",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "nonce",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "uint128",
          "name": "amountReceive",
          "type": "uint128"
        }
      ],
      "name": "Accept",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "blockNumber",
          "type": "uint32"
        }
      ],
      "name": "BlockCommit",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "blockNumber",
          "type": "uint32"
        }
      ],
      "name": "BlockExecuted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "blockNumber",
          "type": "uint32"
        }
      ],
      "name": "BlockProven",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint32",
          "name": "blockNumber",
          "type": "uint32"
        }
      ],
      "name": "BlockSynced",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "totalBlocksVerified",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "totalBlocksCommitted",
          "type": "uint32"
        }
      ],
      "name": "BlocksRevert",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "ExodusMode",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "nonce",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "bytes",
          "name": "fact",
          "type": "bytes"
        }
      ],
      "name": "FactAuth",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "nonce",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "time",
          "type": "uint256"
        }
      ],
      "name": "FactAuthResetTime",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "newGovernor",
          "type": "address"
        }
      ],
      "name": "NewGovernor",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "serialId",
          "type": "uint64"
        },
        {
          "indexed": false,
          "internalType": "enum Operations.OpType",
          "name": "opType",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "bytes",
          "name": "pubData",
          "type": "bytes"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "expirationBlock",
          "type": "uint256"
        }
      ],
      "name": "NewPriorityRequest",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint16",
          "name": "tokenId",
          "type": "uint16"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "decimals",
          "type": "uint8"
        }
      ],
      "name": "NewToken",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "slaverChainId",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "syncHash",
          "type": "bytes32"
        }
      ],
      "name": "ReceiveSlaverSyncHash",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "blockNumber",
          "type": "uint32"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "syncHash",
          "type": "bytes32"
        }
      ],
      "name": "SendMasterSyncHash",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "syncHash",
          "type": "bytes32"
        }
      ],
      "name": "SendSlaverSyncHash",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "newGateway",
          "type": "address"
        }
      ],
      "name": "SetGateway",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "chainId",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "newSyncService",
          "type": "address"
        }
      ],
      "name": "SetSyncService",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint16",
          "name": "token",
          "type": "uint16"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "paused",
          "type": "bool"
        }
      ],
      "name": "TokenPausedUpdate",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "validatorAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        }
      ],
      "name": "ValidatorStatusUpdate",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint16",
          "name": "tokenId",
          "type": "uint16"
        },
        {
          "indexed": false,
          "internalType": "uint128",
          "name": "amount",
          "type": "uint128"
        }
      ],
      "name": "Withdrawal",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "withdrawHash",
          "type": "bytes32"
        }
      ],
      "name": "WithdrawalCall",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "withdrawHash",
          "type": "bytes32"
        }
      ],
      "name": "WithdrawalL1",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint16",
          "name": "tokenId",
          "type": "uint16"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "recepient",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint128",
          "name": "amount",
          "type": "uint128"
        }
      ],
      "name": "WithdrawalPending",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "withdrawHash",
          "type": "bytes32"
        }
      ],
      "name": "WithdrawalPendingL1",
      "type": "event"
    },
    {
      "stateMutability": "payable",
      "type": "fallback"
    },
    {
      "inputs": [],
      "name": "ALL_CHAINS",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "CHAIN_ID",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_FEE_ADDRESS",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MASTER_CHAIN_ID",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_CHAIN_ID",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MIN_CHAIN_ID",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint128",
          "name": "amount",
          "type": "uint128"
        },
        {
          "internalType": "uint16",
          "name": "fastWithdrawFeeRate",
          "type": "uint16"
        },
        {
          "internalType": "uint32",
          "name": "accountIdOfNonce",
          "type": "uint32"
        },
        {
          "internalType": "uint8",
          "name": "subAccountIdOfNonce",
          "type": "uint8"
        },
        {
          "internalType": "uint32",
          "name": "nonce",
          "type": "uint32"
        }
      ],
      "name": "acceptERC20",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address payable",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "uint128",
          "name": "amount",
          "type": "uint128"
        },
        {
          "internalType": "uint16",
          "name": "fastWithdrawFeeRate",
          "type": "uint16"
        },
        {
          "internalType": "uint32",
          "name": "accountIdOfNonce",
          "type": "uint32"
        },
        {
          "internalType": "uint8",
          "name": "subAccountIdOfNonce",
          "type": "uint8"
        },
        {
          "internalType": "uint32",
          "name": "nonce",
          "type": "uint32"
        }
      ],
      "name": "acceptETH",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "accepts",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "name": "authFacts",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "name": "authFactsResetTimer",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "chainSyncServiceMap",
      "outputs": [
        {
          "internalType": "contract ISyncService",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint32",
              "name": "blockNumber",
              "type": "uint32"
            },
            {
              "internalType": "uint32",
              "name": "blockSequence",
              "type": "uint32"
            },
            {
              "internalType": "uint64",
              "name": "priorityOperations",
              "type": "uint64"
            },
            {
              "internalType": "bytes32",
              "name": "pendingOnchainOperationsHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "syncHash",
              "type": "bytes32"
            }
          ],
          "internalType": "struct Storage.StoredBlockInfo",
          "name": "_lastCommittedBlockData",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "newStateHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "publicData",
              "type": "bytes"
            },
            {
              "components": [
                {
                  "internalType": "bytes",
                  "name": "ethWitness",
                  "type": "bytes"
                },
                {
                  "internalType": "uint32",
                  "name": "publicDataOffset",
                  "type": "uint32"
                }
              ],
              "internalType": "struct ZkLink.OnchainOperationData[]",
              "name": "onchainOperations",
              "type": "tuple[]"
            },
            {
              "internalType": "uint32",
              "name": "blockNumber",
              "type": "uint32"
            }
          ],
          "internalType": "struct ZkLink.CommitBlockInfo[]",
          "name": "_newBlocksData",
          "type": "tuple[]"
        }
      ],
      "name": "commitCompressedBlocks",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "contract IERC20",
          "name": "_token",
          "type": "address"
        },
        {
          "internalType": "uint104",
          "name": "_amount",
          "type": "uint104"
        },
        {
          "internalType": "bytes32",
          "name": "_zkLinkAddress",
          "type": "bytes32"
        },
        {
          "internalType": "uint8",
          "name": "_subAccountId",
          "type": "uint8"
        },
        {
          "internalType": "bool",
          "name": "_mapping",
          "type": "bool"
        }
      ],
      "name": "depositERC20",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_zkLinkAddress",
          "type": "bytes32"
        },
        {
          "internalType": "uint8",
          "name": "_subAccountId",
          "type": "uint8"
        }
      ],
      "name": "depositETH",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "components": [
                {
                  "internalType": "uint32",
                  "name": "blockNumber",
                  "type": "uint32"
                },
                {
                  "internalType": "uint32",
                  "name": "blockSequence",
                  "type": "uint32"
                },
                {
                  "internalType": "uint64",
                  "name": "priorityOperations",
                  "type": "uint64"
                },
                {
                  "internalType": "bytes32",
                  "name": "pendingOnchainOperationsHash",
                  "type": "bytes32"
                },
                {
                  "internalType": "bytes32",
                  "name": "syncHash",
                  "type": "bytes32"
                }
              ],
              "internalType": "struct Storage.StoredBlockInfo",
              "name": "storedBlock",
              "type": "tuple"
            },
            {
              "internalType": "bytes[]",
              "name": "pendingOnchainOpsPubdata",
              "type": "bytes[]"
            }
          ],
          "internalType": "struct ZkLink.ExecuteBlockInfo[]",
          "name": "_blocksData",
          "type": "tuple[]"
        }
      ],
      "name": "executeCompressedBlocks",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "exodusMode",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "firstPriorityRequestId",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "gateway",
      "outputs": [
        {
          "internalType": "contract IL2Gateway",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getNoticePeriod",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes",
          "name": "initializationParameters",
          "type": "bytes"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "isReadyForUpgrade",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "networkGovernor",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "pendingL1Withdraws",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "pendingWithdrawWithCalls",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        },
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        },
        {
          "internalType": "uint16",
          "name": "",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "",
          "type": "uint16"
        }
      ],
      "name": "performedExodus",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "periphery",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "name": "priorityRequests",
      "outputs": [
        {
          "internalType": "bytes20",
          "name": "hashedPubData",
          "type": "bytes20"
        },
        {
          "internalType": "uint64",
          "name": "expirationBlock",
          "type": "uint64"
        },
        {
          "internalType": "enum Operations.OpType",
          "name": "opType",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "name": "storedBlockHashes",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "syncServiceMap",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "synchronizedChains",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "tokenIds",
      "outputs": [
        {
          "internalType": "uint16",
          "name": "",
          "type": "uint16"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint16",
          "name": "",
          "type": "uint16"
        }
      ],
      "name": "tokens",
      "outputs": [
        {
          "internalType": "bool",
          "name": "registered",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "paused",
          "type": "bool"
        },
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint8",
          "name": "decimals",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalBlocksCommitted",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalBlocksExecuted",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalBlocksProven",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalBlocksSynchronized",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalCommittedPriorityRequests",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalOpenPriorityRequests",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "validators",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "verifier",
      "outputs": [
        {
          "internalType": "contract IVerifier",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ,
  ], account);
  // Token contract address
  const tokenAddress = "0x01CB59F3C16FAfe63955e4d435adAFa23d9aBBde";  // bsc 的usdt代币地址
  // Contract address to be approved
  const contractAddress = "0x3145BEf9A28BB7c348bCE8EB341ed21Cd34956e3";  // zkSync address placeholder bsc network  

  // ABI for ERC20 token (only including the approve function)
  const tokenAbi = [
    "function approve(address spender, uint256 amount) public returns (bool)"
  ];

  // Create a contract instance for the token
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, account);

  // Amount to approve (in wei, so 1 million tokens with 18 decimals)
  const amount = ethers.utils.parseUnits("100", 6);

  // Approve the contract to spend the tokens
  const tx = await tokenContract.approve(contractAddress, amount);
  console.log(`Approve Transaction hash: ${tx.hash}`);

  // // depositERC20(address _token,uint104 _amount,bytes32 _zkLinkAddress,uint8 _subAccountId,bool _mapping)
  // const depositTx = contract.depositERC20("0x01CB59F3C16FAfe63955e4d435adAFa23d9aBBde", 2000000, ethers.utils.hexZeroPad("0x837b4bb0486ee6e9122bbc2a832cbb0285859b7a", 32), 0, false, {
  //   gasLimit: 1000000, // 直接使用数值设置 gas 限制
  //   gasPrice: ethers.utils.parseUnits('5', 'gwei') // 可选：设置 gas 价格为 5 gwei
  // })

  // ABI for depositERC20 function
  const zkSyncAbi = [
    "function depositERC20(address _token, uint104 _amount, bytes32 _zkLinkAddress, uint8 _subAccountId, bool _mapping) public"
  ];

  // Create a contract instance for zkSync
  const zkSyncContract = new ethers.Contract(contractAddress, zkSyncAbi, account);

  // Call depositERC20 function
  const depositTx = await zkSyncContract.depositERC20(
    "0x01CB59F3C16FAfe63955e4d435adAFa23d9aBBde",
    2000000,
    ethers.utils.hexZeroPad("0x837b4bb0486ee6e9122bbc2a832cbb0285859b7a", 32),
    0,
    false,
    {
      gasLimit: 1000000, // 直接使用数值设置 gas 限制
      gasPrice: ethers.utils.parseUnits('5', 'gwei') // 可选：设置 gas 价格为 5 gwei
    }
  );

  // Log the transaction hash
  console.log(`Deposit Transaction hash: ${depositTx.hash}`);

}

main();