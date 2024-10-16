// 使用 Hardhat 提供的 ethers
const { ethers } = require("hardhat");

async function getBalances(contractAddress, erc20TokenAddresses) {
    // 获取签名者
    const [deployer, addr1, addr2] = await ethers.getSigners();

    // 打印签名者地址
    console.log("Deployer address:", deployer.address);
    console.log("Address 1:", addr1.address);
    console.log("Address 2:", addr2.address);

    // 获取原生代币余额（ETH）
    const ethBalance = await ethers.provider.getBalance(contractAddress);
    console.log(`ETH Balance of ${contractAddress}: ${ethers.utils.formatEther(ethBalance)} ETH`);

    // 获取ERC-20代币余额
    for (let tokenAddress of erc20TokenAddresses) {
        const erc20Abi = [
            // 这里是标准的 ERC-20 balanceOf 方法的 ABI
            "function balanceOf(address owner) view returns (uint256)"
        ];

        // 创建ERC-20合约实例
        const erc20Contract = new ethers.Contract(tokenAddress, erc20Abi, ethers.provider);

        // 获取合约地址的ERC-20代币余额
        const tokenBalance = await erc20Contract.balanceOf(contractAddress);
        
        console.log(`Token Balance of ${contractAddress} for contract ${tokenAddress}: ${ethers.utils.formatUnits(tokenBalance, 6)} tokens`);
    }
}

// 示例合约地址和ERC-20代币合约地址
const contractAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // 替换为目标合约地址
const erc20TokenAddresses = [
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // 替换为实际的ERC-20代币合约地址 USDT
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" // USDC
    // 可以添加更多ERC-20代币合约地址
];

// 执行获取余额的函数
getBalances(contractAddress, erc20TokenAddresses);
