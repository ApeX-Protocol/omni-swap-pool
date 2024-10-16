const { ethers } = require("hardhat");
require('dotenv').config();  // Ensure environment variables are loaded

async function main() {
  const [deployer, addr1, addr2] = await ethers.getSigners();

  // Print account balances
  const balanceDeployer = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.utils.formatEther(balanceDeployer));

  // Print signer addresses
  console.log("Deployer address:", deployer.address);
  console.log("Address 1:", addr1.address);
  console.log("Address 2:", addr2.address);

  // Gas settings (adjust according to your network)
  let gasPrice = ethers.utils.parseUnits('1', 'gwei');  // bsc gasPrice 5gwei、 arb 0.1gwei、 mantle 0.02gwei、base 0.008gwei、 sepolia 14gwei
  let gasLimit = ethers.utils.parseUnits("5", 6);  // bsc 10**10、 arb 10**8、mantle 10**10、base 10**6
  gasPrice = await ethers.provider.getGasPrice();
  console.log("Current Gas Price (Gwei):", ethers.utils.formatUnits(gasPrice, 'gwei'));
  const bufferMultiplier = ethers.BigNumber.from(110);  // 110 represents a 10% increase
  gasPrice = gasPrice.mul(bufferMultiplier).div(100);  // Equivalent to multiplying by 1.1
  const gasPriceInGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
  console.log("Gas Price with Buffer in Gwei:", gasPriceInGwei);

  // Assign allowedSigners from environment variables
  const allowedSigners = [
    process.env.ALLOWED_SIGNER_1,
    process.env.ALLOWED_SIGNER_2,
    process.env.ALLOWED_SIGNER_3
  ];

  // Initial whitelist (could be an empty list or initialized with some addresses)
  const initialWhitelist = [deployer.address, addr1.address];  // Add more addresses as needed

  // const zkSyncL1GatewayAddress = "0x05b6d82dc13afeaf6a8eff50fa2911438ee8b029"; // zkSync address sepolia  
  // const zkSyncL1GatewayAddress = "0x3145bef9a28bb7c348bce8eb341ed21cd34956e3";  // zkSync address bscTestnet  
  // const zkSyncL1GatewayAddress = "0x0849e9861e506d6295b4c6a2e5a9a35435989721"; // zkSync address arbTestnet
  // const zkSyncL1GatewayAddress = "0xa2752461843311ee9e8bccbaa22a66c0d49b62ea";  // zkSync address mantleTestnet 
  // const zkSyncL1GatewayAddress = "0x2af769602632013eec16bc25eb100960aa4e1b56";  // zkSync address baseTestnet  

  const zkSyncL1GatewayAddress = "0x35D173cdfE4d484BC5985fDa55FABad5892c7B82";  // zkSync address mainnet
  // const zkSyncL1GatewayAddress = "0xb8d9f005654b7b127b34dae8f973ba729ca3a2d9";  // zkSync address bscMainnet
  // const zkSyncL1GatewayAddress = "0x3169844a120c0f517b4eb4a750c08d8518c8466a";  // zkSync address arbMainnet
  // const zkSyncL1GatewayAddress = "0x3c7c0ebfcd5786ef48df5ed127cddeb806db976c";  // zkSync address mantleMainnet
  // const zkSyncL1GatewayAddress = "0xee7981c4642de8d19aed11da3bac59277dfd59d7";  // zkSync address baseMainnet

  // USDT Address  后续部署合约的时候，如果新增了多链资产，也就是垫付资金，一定要在L1Pool合约里multiChainAssets添加新的多链资产
  // const usdtAddress = "0xFa9f5b3FA32b95D5e14C7f0cAFe11D75654f7cf8"; // arbTestnet usdt address

  const usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // mainnet usdt address
  // const usdtAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"; // arbMainnet usdt address
  // const usdtAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"; // baseMainnet usdt address
  

  // Deploy the L1Pool contract
  console.log("Deploying L1Pool contract...");
  const L1Pool = await ethers.getContractFactory("L1Pool");
  const l1Pool = await L1Pool.deploy(allowedSigners, initialWhitelist, zkSyncL1GatewayAddress, usdtAddress, {
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });

  // Wait for the contract to be deployed
  await l1Pool.deployed();

  console.log("Transaction Hash:", l1Pool.deployTransaction.hash);  // Transaction hash
  console.log("L1Pool deployed to:", l1Pool.address);  // Contract address
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error deploying L1Pool:", error);
    process.exit(1);
  });
