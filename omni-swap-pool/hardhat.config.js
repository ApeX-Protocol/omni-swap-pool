require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");

const privateKeys = process.env.DEVNET_PRIVKEYS !== undefined ? process.env.DEVNET_PRIVKEYS.split(',') : [];

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.2",
        settings: {
          optimizer: {
            enabled: true,   // 启用优化
            runs: 200        // 设置优化运行次数
          }
        }
      },
    ],
  },
  mocha: {
    timeout: 600000, // 10 minutes
  },  
  networks: {
    hardhat: {
      // allowUnlimitedContractSize: true,
      // chainId: 1337,
      // forking: {
      //   // url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`, // EthMainnet
      //   // url: `https://bsc-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`, // BscMainnet
      //   url: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`, // ArbMainnet
      //   // url: `https://mantle-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`, // MantleMainnet
      //   // url: `https://base.blockpi.network/v1/rpc/public`, // BaseMainnet
      //   // blockNumber: 244543510, // Modify with network
      //   timeout: 200000
      // }
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    mainnet: {
      url: `https://ethereum-rpc.publicnode.com`,
      accounts: privateKeys
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: privateKeys
    },
    bscMainnet: {
      url: `https://bsc-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: privateKeys
    },
    bscTestnet: {
      // url: `https://api.zan.top/node/v1/bsc/testnet/public`,
      url: `https://bsc-testnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: privateKeys
    },
    arbMainnet: {
      url: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: privateKeys
    },
    arbTestnet: {
      url: `https://arbitrum-sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: privateKeys
    },
    mantleMainnet: {
      url: `https://mantle-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: privateKeys
    },
    mantleTestnet: {
      url: `https://rpc.sepolia.mantle.xyz`,
      accounts: privateKeys
    },
    baseMainnet: {
      url: `https://base.blockpi.network/v1/rpc/public`,
      accounts: privateKeys
    },
    baseTestnet: {
      url: 'https://base-sepolia-rpc.publicnode.com',
      // url: `https://base-sepolia.blockpi.network/v1/rpc/public`,
      accounts: privateKeys
    }
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.MIANNETSCAN_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY,
      bscTestnet: process.env.BSCSCAN_API_KEY,
      arbitrumOne: process.env.ARBSCAN_API_KEY,
      arbTestnet: process.env.ARBSCAN_API_KEY,
      baseMainnet: process.env.BASEMAINNETSCAN_API_KEY,
      mantleTestnet: process.env.MANTLESCAN_API_KEY
    },
    customChains: [
      {
        network: "baseMainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      },
      {
        network: "mantleTestnet",
        chainId: 5001,
        urls: {
          apiURL: "https://api-testnet.mantlescan.com/api",
          browserURL: "https://explorer.testnet.mantle.xyz/"
        }
      },
      {
        network: "arbTestnet",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io"
        },
      }

    ]
  },
  gasReporter: {
    enabled: true,
  },
};
