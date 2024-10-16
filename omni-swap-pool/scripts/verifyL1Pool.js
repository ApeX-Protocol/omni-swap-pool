const hre = require("hardhat");

async function main() {
  const [deployer, addr1, addr2] = await ethers.getSigners();
  
  // 合约的地址
  const contractAddress = "0xd6e8dd7034b1c6953b6eb0ebe602b25c72a86655"; // 替换为你实际部署后的 L1Pool 合约地址
  
  // 构造函数的参数
  const allowedSigners = [
    process.env.ALLOWED_SIGNER_1,
    process.env.ALLOWED_SIGNER_2,
    process.env.ALLOWED_SIGNER_3
  ];

  const initialWhitelist = [
    process.env.WHITELIST_1 || deployer.address, // 示例白名单地址
    process.env.WHITELIST_2 || addr1.address
  ];

  const zkSyncL1GatewayAddress = "0x35D173cdfE4d484BC5985fDa55FABad5892c7B82"; // zkSync L1 网关地址

  const usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // arbTestnet usdt address

  try {
    // 验证合约
    console.log("Verifying contract...");

    await hre.run("verify:verify", {
      address: contractAddress, // 部署合约的地址
      contract: "contracts/core/L1Pool.sol:L1Pool", // L1Pool 合约的路径和名称
      constructorArguments: [
        allowedSigners,
        initialWhitelist,
        zkSyncL1GatewayAddress,
        usdtAddress
      ], // 构造函数参数
    });

    console.log("L1Pool contract verified successfully!");
  } catch (error) {
    console.error("L1Pool contract verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
