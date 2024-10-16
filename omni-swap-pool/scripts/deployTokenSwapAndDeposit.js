const { ethers } = require("hardhat");

async function main() {

  const [deployer, addr1, addr2] = await ethers.getSigners();

  // 获取当前账户的 nonce
  let nonce = await ethers.provider.getTransactionCount(deployer.address);
  console.log("Current nonce:", nonce);

  // 部署 TokenSwapAndDeposit 主合约
  console.log("Deploying TokenSwapAndDeposit...");
  // 设置 gas price
  const gasPrice = ethers.utils.parseUnits('0.02', 'gwei');  // bsc gasPrice 5gwei、 arb 0.1gwei、 mantle 0.02gwei、base 0.008gwei、 sepolia 14gwei
  const gasLimit = ethers.utils.parseUnits("5", 10);

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

  // const mockRoutersAddress = "0x34D945acdEE382e6274ADbD88F89955dc27802E5"; // 替换成部署deploy1inch脚本后返回的 MockAggregationRouterV5 合约地址
  const mockRoutersAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582"; // 真实主网公链 1inch 合约地址

  // 传入允许的签名者
  // 从环境变量中获取允许的签名者
  const allowedSigners = [
    process.env.ALLOWED_SIGNER_1,
    process.env.ALLOWED_SIGNER_2,
    process.env.ALLOWED_SIGNER_3
  ]; 
  // const allowedSigners = [deployer.address, addr1.address, addr2.address];  // 这里替换为实际的签名者地址

  const TokenSwapAndDeposit = await ethers.getContractFactory("TokenSwapAndDeposit");
  const tokenSwapAndDeposit = await TokenSwapAndDeposit.deploy(mockRoutersAddress, zkSyncL1GatewayAddress, allowedSigners, {
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });
  await tokenSwapAndDeposit.deployed();
  console.log("Transaction Hash:", tokenSwapAndDeposit.deployTransaction.hash);  // 交易哈希
  console.log("TokenSwapAndDeposit deployed to:", tokenSwapAndDeposit.address);  // 合约地址
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
