const hre = require("hardhat");

async function main() {
  // 合约的部署地址
  const contractAddress = "0x8ED32Fc5c3C18330997670d7Be1702126c40aBed"; // 替换为你的实际合约地址

  // 构造函数参数
  const name = "Optimism";        // 合约名称
  const symbol = "OP";            // 合约符号
  const decimals = 18;              // 代币的小数位数

  try {
    // 验证合约
    console.log("Verifying contract...");

    await hre.run("verify:verify", {
      address: contractAddress,  // 合约部署的地址
      contract: "contracts/mock/MockERC20.sol:MockERC20", // 合约路径和名称
      constructorArguments: [name, symbol, decimals], // 构造函数参数
    });

    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Contract verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
