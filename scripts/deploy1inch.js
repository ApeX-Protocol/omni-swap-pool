const { ethers } = require("hardhat");

async function main() {
  const [deployer, addr1, _] = await ethers.getSigners();

  // // 打印账户余额
  const balanceDeployer = await ethers.provider.getBalance(deployer.address);
  const balanceAddr1 = await ethers.provider.getBalance(addr1.address);
  console.log("Deployer balance:", ethers.utils.formatEther(balanceDeployer));
  console.log("Address 1 balance:", ethers.utils.formatEther(balanceAddr1));  
  
  // 打印签名者地址
  console.log("Deployer address:", deployer.address);
  console.log("Address 1:", addr1.address);

  console.log("Deploying contracts with the account:", deployer.address);

  // 设置 gas price
  // const gasPrice = ethers.utils.parseUnits('0.02', 'gwei');  // bsc gasPrice 5gwei、 arb 0.1gwei、 mantle 0.02gwei、base 0.008gwei、 sepolia 14gwei
  // const gasLimit = ethers.utils.parseUnits("5", 10);  // mantle 的gasLimit配置
  const gasPrice = ethers.utils.parseUnits('5', 'gwei');
  const gasLimit = ethers.utils.parseUnits("5", 6);

  // 部署MockERC20
  console.log("Deploying MockERC20...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy("TokenA", "TKA", 6, {
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });
  await tokenA.deployed();
  console.log("TokenA (MockERC20) deployed to:", tokenA.address);

  const tokenB = await MockERC20.deploy("TokenB", "TKB", 6, {
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });
  await tokenB.deployed();
  console.log("TokenB (MockERC20) deployed to:", tokenB.address);

  // 可以继续部署更多的 ERC20 代币合约，例如 TokenC、TokenD 等
  
  // 部署MockAggregationRouterV5
  console.log("Deploying MockAggregationRouterV5...");
  const MockAggregationRouterV5 = await ethers.getContractFactory("MockAggregationRouterV5");
  const mockRouter = await MockAggregationRouterV5.deploy({
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });
  await mockRouter.deployed();
  console.log("MockAggregationRouterV5 deployed to:", mockRouter.address);

  // 预先分配一些代币给 MockAggregationRouterV5，以确保流动性
  console.log("Minting tokens and transferring to MockAggregationRouterV5...");
  const mintTxA = await tokenA.mint(addr1.address, ethers.utils.parseUnits("100000000",6), {
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });
  await mintTxA.wait();
  const mintTxB = await tokenB.mint(addr1.address, ethers.utils.parseUnits("100000000",6), {
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });
  await mintTxB.wait();
  console.log("Tokens minted to addr1");

  // 获取 addr1 的代币余额
  const beforeBalanceA = await tokenA.balanceOf(addr1.address);
  const beforeBalanceB = await tokenB.balanceOf(addr1.address);
  console.log("Before Balance of tokenA in addr1:", ethers.utils.formatUnits(beforeBalanceA,6));
  console.log("Before Balance of tokenB in addr1:", ethers.utils.formatUnits(beforeBalanceB,6));

  const transferTxA = await tokenA.connect(addr1).transfer(mockRouter.address, ethers.utils.parseUnits("500000",6), {
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });
  await transferTxA.wait();
  const transferTxB = await tokenB.connect(addr1).transfer(mockRouter.address, ethers.utils.parseUnits("500000",6), {
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });
  await transferTxB.wait();
  console.log("Tokens transferred to MockAggregationRouterV5.");

  // 查看 MockAggregationRouterV5 合约地址的代币数量
  const mockRouterBalanceA = await tokenA.balanceOf(mockRouter.address);
  const mockRouterBalanceB = await tokenB.balanceOf(mockRouter.address);
  console.log("Balance of tokenA in MockAggregationRouterV5:", ethers.utils.formatUnits(mockRouterBalanceA,6));
  console.log("Balance of tokenB in MockAggregationRouterV5:", ethers.utils.formatUnits(mockRouterBalanceB,6));

  // 转移代币后，再次获取 addr1 的代币余额
  const afterBalanceA = await tokenA.balanceOf(addr1.address);
  const afterBalanceB = await tokenB.balanceOf(addr1.address);
  console.log("After Balance of tokenA in addr1:", ethers.utils.formatUnits(afterBalanceA,6));
  console.log("After Balance of tokenB in addr1:", ethers.utils.formatUnits(afterBalanceB,6));
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
