const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  // 打印签名者地址
  console.log("Deploying contracts with the account:", deployer.address);

  // const gasPrice = ethers.utils.parseUnits('0.02', 'gwei');  // bsc gasPrice 5gwei、 arb 0.1gwei、 mantle 0.02gwei、base 0.008gwei、 sepolia 14gwei
  // const gasLimit = ethers.utils.parseUnits("5", 10);  // mantle 的gasLimit配置
  const gasPrice = ethers.utils.parseUnits('0.1', 'gwei');
  const gasLimit = ethers.utils.parseUnits("5", 10);

  // 部署MockAggregationRouterV5
  console.log("Deploying MockAggregationRouterV5...");
  const MockAggregationRouterV5 = await ethers.getContractFactory("MockAggregationRouterV5");
  const mockRouter = await MockAggregationRouterV5.deploy({
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });
  await mockRouter.deployed();
  console.log("MockAggregationRouterV5 deployed to:", mockRouter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
