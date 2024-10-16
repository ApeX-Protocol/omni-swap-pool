const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    // gasPrice 的值 bsc 5gwei、 arb 0.1gwei、 mantle 0.02gwei、base 0.008gwei
    // gasLimit 的值 bsc 1000000、 arb 1000000、、 mantle 10000000000、base 1000000
    const gasPrice = ethers.utils.parseUnits('0.01', 'gwei');
    const gasLimit = ethers.utils.parseUnits("5", 6);

    // const usdtAddress = ""; // USDT sepolia 合约地址
    // const usdtAddress = "0x01CB59F3C16FAfe63955e4d435adAFa23d9aBBde"; // USDT bscTestnet 合约地址
    const usdtAddress = "0xFa9f5b3FA32b95D5e14C7f0cAFe11D75654f7cf8"; // USDT arbTestnet 合约地址
    // const usdtAddress = "0xA98a1b4E508BC8c0cBE5e6610Cb7a001aac4425D"; // USDT mantleTestnet 合约地址
    // const usdtAddress = "0x2340C88808dcE139B36864970074315BCb0c9Fe0"; // USDT baseTestnet 合约地址

    // const usdtAddress = "0xF35a44977E9831f564C9AF3b721748e840c1ef4C"; // USDC bscTestnet 合约地址
    // const usdtAddress = "0x17DAFC238DfE569e782CDf553fC9aE116529Bc3F"; // USDC arbTestnet 合约地址
    // const usdtAddress = "0x562f3b33eCc1044C94d38f52069beE1F4Bc1218e"; // USDC mantleTestnet 合约地址
    // const usdtAddress = "0xAF3A3Fd0EEA662dd1Aefa8b04C201038a4Ff5761"; // USDC baseTestnet 合约地址
    

    const recipientAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582"; // 目标合约地址MockAggregationRouterV5
    const walletAddress = "0x04DeEb0B98a46133f182E5f42FDd03e9ac8FdE9c"; // 钱包地址
    const privateKey = process.env.PRIVATE_KEY; // 从环境变量中获取私钥

    const provider = ethers.provider;
    const wallet = new ethers.Wallet(privateKey, provider);
    // 转移的金额，注意 USDT 通常有 6 位小数
    const AMOUNT_TO_TRANSFER = ethers.utils.parseUnits("1000", 6); // 例如，转移 200 USDT

    const usdtAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 value) returns (bool)"
    ];

    const usdtContract = new ethers.Contract(usdtAddress, usdtAbi, wallet);

    const beforeBalance = await usdtContract.balanceOf(walletAddress);
    console.log(`USDT BeforeBalance: ${ethers.utils.formatUnits(beforeBalance, 6)}`);

    const transferTx = await usdtContract.transfer(recipientAddress, AMOUNT_TO_TRANSFER, {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await transferTx.wait();
    console.log("transferTx txHash:",transferTx.hash)

    const afterBalance = await usdtContract.balanceOf(walletAddress);
    console.log(`USDT AfterBalance: ${ethers.utils.formatUnits(afterBalance, 6)}`);
    console.log(`Transferred ${ethers.utils.formatUnits(AMOUNT_TO_TRANSFER, 6)} USDT to ${recipientAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
