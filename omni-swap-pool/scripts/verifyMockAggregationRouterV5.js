const hre = require("hardhat");

async function main() {
  // 设置合约的部署地址
  const contractAddress = "0x079621c7d9AADAd9fE81930a4617bE6bF352e190"; // 替换为实际部署后的 MockAggregationRouterV5 合约地址

  try {
    // 验证合约
    console.log("Verifying MockAggregationRouterV5 contract...");

    await hre.run("verify:verify", {
      address: contractAddress, // 部署合约的地址
      contract: "contracts/mock/MockAggregationRouterV5.sol:MockAggregationRouterV5", // MockAggregationRouterV5 合约的路径和名称
      constructorArguments: [], // 没有构造函数参数，传入空数组
    });

    console.log("MockAggregationRouterV5 contract verified successfully!");
  } catch (error) {
    console.error("MockAggregationRouterV5 contract verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
