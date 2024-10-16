const { ethers } = require("hardhat");

async function main() {
  const richAccount = "0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D"; // 假设这是有USDT余额的账户
  const recipientAccount = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // 接收账户 fork主网提供的账户
  const tokenAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"; // USDC合约地址
  const amount = ethers.utils.parseUnits("100000", 6); // 100,000 USDT

  // 设置gasPrice和gasLimit
  const gasPrice = ethers.utils.parseUnits("1", "gwei");
  const gasLimit = 1000000;

  // Impersonate richAccount
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [richAccount],
  });
  const impersonatedSigner = await ethers.getSigner(richAccount);

  // 确保 richAccount 有足够的 ETH 支付 gas 费用
  const [deployer] = await ethers.getSigners();
  
  // 打印 deployer 地址
  console.log("Deployer address:", deployer.address);

  await deployer.sendTransaction({
    to: richAccount,
    value: ethers.utils.parseEther("1.0"), // 发送 1 ETH 用于支付 gas
    gasPrice: gasPrice,
    gasLimit: gasLimit,
  });

  // 获取 USDT 合约实例
  const tokenContract = await ethers.getContractAt("IERC20", tokenAddress, impersonatedSigner);

  // 检查 richAccount 在转账前的 USDT 余额
  const tokenBalance = await tokenContract.balanceOf(richAccount);
  console.log(`Token balance of richAccount before transfer: ${ethers.utils.formatUnits(tokenBalance, 6)} USDT`);

  const ethBalance = await impersonatedSigner.getBalance();
  console.log(`ETH balance of richAccount before transfer: ${ethers.utils.formatEther(ethBalance)} ETH`);

  // 转移 USDT
  const tx = await tokenContract.transfer(recipientAccount, amount, {
    gasPrice: gasPrice,
    gasLimit: gasLimit,
  });
  await tx.wait();

  console.log(`Transferred ${ethers.utils.formatUnits(amount, 6)} USDT to ${recipientAccount}`);

  // 停止模拟 richAccount
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [richAccount],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
