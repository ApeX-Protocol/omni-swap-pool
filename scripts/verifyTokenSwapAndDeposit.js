const hre = require("hardhat");

async function main() {
const [deployer, addr1, addr2] = await ethers.getSigners();
  // 合约的地址
  const contractAddress = "0xaC21a795A233B52F0B8a8dDD61709f6802a0797b"; // 替换为你实际部署后的合约地址

  // 构造函数的参数
  const aggregationRouterV5Address = "0x1111111254EEB25477B68fb85Ed929f73A960582"; // 1inch Router 主网地址
  const zkSyncL1GatewayAddress = "0x35D173cdfE4d484BC5985fDa55FABad5892c7B82";  // zkSync L1 网关地址
  const allowedSigners = [
    process.env.ALLOWED_SIGNER_1,
    process.env.ALLOWED_SIGNER_2,
    process.env.ALLOWED_SIGNER_3
  ]; 
//   const allowedSigners = [deployer.address, addr1.address, addr2.address];

  try {
    // 验证合约
    console.log("Verifying contract...");

    await hre.run("verify:verify", {
      address: contractAddress, // 部署合约的地址
      contract: "contracts/core/TokenSwapAndDeposit.sol:TokenSwapAndDeposit", // 合约的路径和名称
      constructorArguments: [
        aggregationRouterV5Address,
        zkSyncL1GatewayAddress,
        allowedSigners
      ], // 构造函数参数
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
