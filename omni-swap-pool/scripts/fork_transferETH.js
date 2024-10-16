const { ethers } = require("hardhat");

// 从 impersonatedAccount 账户转移 ETH 至 recipientAccount 账户
async function main() {
    const impersonatedAccount = "0x9b64203878F24eB0CDF55c8c6fA7D08Ba0cF77E5"; // 拥有大量资金的账户地址
    const recipientAccount = "0x837b4BB0486eE6E9122BBC2a832CBb0285859B7a"; // 你想要充值的账户地址

    // 设置 gasPrice 和 gasLimit
    const gasPrice = ethers.utils.parseUnits("0.01", "gwei"); // 0.01 gwei
    const gasLimit = 1000000; 

    // 模拟账户
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [impersonatedAccount],
    });

    const signer = await ethers.getSigner(impersonatedAccount);

    // 打印初始余额
    const initialImpersonatedBalance = await ethers.provider.getBalance(impersonatedAccount);
    const initialRecipientBalance = await ethers.provider.getBalance(recipientAccount);

    console.log(`Initial balance of impersonatedAccount: ${ethers.utils.formatEther(initialImpersonatedBalance)} ETH`);
    console.log(`Initial balance of recipientAccount: ${ethers.utils.formatEther(initialRecipientBalance)} ETH`);

    // 从 impersonatedAccount 转移 ETH 到 recipientAccount
    const tx = await signer.sendTransaction({
        to: recipientAccount,
        value: ethers.utils.parseEther("100"), // 充值 100 ETH
        // gasPrice: gasPrice, // 指定 gasPrice
        // gasLimit: gasLimit, // 指定 gasLimit
    });

    // 等待交易完成
    await tx.wait();

    // 打印最终余额
    const finalImpersonatedBalance = await ethers.provider.getBalance(impersonatedAccount);
    const finalRecipientBalance = await ethers.provider.getBalance(recipientAccount);

    console.log(`Final balance of impersonatedAccount: ${ethers.utils.formatEther(finalImpersonatedBalance)} ETH`);
    console.log(`Final balance of recipientAccount: ${ethers.utils.formatEther(finalRecipientBalance)} ETH`);

    // 停止模拟账户
    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [impersonatedAccount],
    });

    console.log("Funds transferred to the recipient account.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
