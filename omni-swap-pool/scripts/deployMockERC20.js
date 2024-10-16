const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  // 打印签名者地址和余额
  const balanceDeployer = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.utils.formatEther(balanceDeployer));
  console.log("Deployer address:", deployer.address);

  // Gas settings (adjust according to your network)
  let gasPrice = ethers.utils.parseUnits('0.1', 'gwei');  // bsc gasPrice 5gwei、 arb 0.1gwei、 mantle 0.02gwei、base 0.008gwei、 sepolia 14gwei
  let gasLimit = ethers.utils.parseUnits("5", 8);  // bsc 10**10、 arb 10**8、mantle 10**10、base 10**6
  gasPrice = await ethers.provider.getGasPrice();
  console.log("Current Gas Price (Gwei):", ethers.utils.formatUnits(gasPrice, 'gwei'));
  const bufferMultiplier = ethers.BigNumber.from(110);  // 110 represents a 10% increase
  gasPrice = gasPrice.mul(bufferMultiplier).div(100);  // Equivalent to multiplying by 1.1
  const gasPriceInGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
  console.log("Gas Price with Buffer in Gwei:", gasPriceInGwei);

  // 部署 MockERC20 合约
  console.log("Deploying MockERC20...");

  // 输入代币名称和符号
  const tokenName = "Wrapped Ether";
  const tokenSymbol = "WETH";
  const decimals = 18;  // 设置代币的小数位数

  // 获取合约工厂并部署合约
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy(tokenName, tokenSymbol, decimals, {
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });

  // 等待合约部署完成
  await token.deployed();

  // 输出已部署的 MockERC20 合约地址
  console.log(`${tokenName} (${tokenSymbol}) deployed to:`, token.address);

  // MockAggregationRouterV5 的合约地址
  const mockRouterAddress = "0x079621c7d9AADAd9fE81930a4617bE6bF352e190";  // 替换为实际的 MockAggregationRouterV5 合约地址

  // 设置铸造代币的数量，注意单位 (decimals)
  const mintAmount = ethers.utils.parseUnits("1000000000", decimals); // 铸造 1,000,000 个代币

  // 铸造代币给部署者地址
  const mintTxDeployer = await token.mint(deployer.address, mintAmount, {
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });
  await mintTxDeployer.wait();
  console.log(`Minted ${ethers.utils.formatUnits(mintAmount, decimals)} ${tokenSymbol} to deployer (${deployer.address})`);

  // 铸造代币给 MockAggregationRouterV5 地址
  const mintTxRouter = await token.mint(mockRouterAddress, mintAmount, {
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });
  await mintTxRouter.wait();
  console.log(`Minted ${ethers.utils.formatUnits(mintAmount, decimals)} ${tokenSymbol} to MockAggregationRouterV5 (${mockRouterAddress})`);

  // 输出代币余额
  const deployerBalance = await token.balanceOf(deployer.address);
  const routerBalance = await token.balanceOf(mockRouterAddress);
  console.log(`Deployer balance of ${tokenSymbol}:`, ethers.utils.formatUnits(deployerBalance, decimals));
  console.log(`MockAggregationRouterV5 balance of ${tokenSymbol}:`, ethers.utils.formatUnits(routerBalance, decimals));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error deploying and minting MockERC20:", error);
    process.exit(1);
  });
