require('dotenv').config();
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const axios = require('axios');

describe("L1Pool Contract Tests", function () {
  let l1Pool;
  let deployer, addr1, addr2;
  let tokenA, tokenB;
  let mockRouter;

  // gasPrice 的值：bsc gasPrice 5gwei、 arb 0.1gwei、 mantle 0.02gwei、base 0.008gwei、 sepolia 14gwei
  // gasLimit 的值：bsc 10**10、 arb 10**8、mantle 10**10、base 10**6
  let gasPrice = ethers.utils.parseUnits('0.1', 'gwei');
  let gasLimit = ethers.utils.parseUnits("6", 6);

  beforeEach(async function () {
    console.log("=====================初始化数据开始========================");
    // 获取 signers
    [deployer, addr1, addr2] = await ethers.getSigners();
  
    console.log("Deployer address:", deployer.address);
    console.log("Address 1:", addr1.address);
    console.log("Address 2:", addr2.address);

    // 获取并打印 gas price
    gasPrice = await ethers.provider.getGasPrice();
    console.log("Current Gas Price (Gwei):", ethers.utils.formatUnits(gasPrice, 'gwei'));

    // Add 10% buffer to gas price using BigNumber arithmetic
    const bufferMultiplier = ethers.BigNumber.from(105);  // 110 represents a 10% increase
    gasPrice = gasPrice.mul(bufferMultiplier).div(100);  // Equivalent to multiplying by 1.1

    const gasPriceInGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
    console.log("Gas Price with Buffer in Gwei:", gasPriceInGwei);
  
    // 已经部署的合约地址（替换为实际的部署地址）
    // const tokenAAddress = "0x4Fd84fCd22205B8cD2946663047df2C6aEDBff4c";  // 替换为实际的 tokenA 合约地址
    // const tokenBAddress = "0xCD8d5D80182d19e1d48A1252f05EB6c27bd410f7";  // 替换为实际的 tokenB 合约地址
    // const tokenAAddress = "0xFa9f5b3FA32b95D5e14C7f0cAFe11D75654f7cf8";  // usdt address arbTestnet
    // const tokenBAddress = "0x8ED32Fc5c3C18330997670d7Be1702126c40aBed";  // optimism address arbTestnet

    // const tokenAAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";  // usdt address baseMainnet
    const tokenBAddress = "0x4200000000000000000000000000000000000006";  // weth address baseMainnet
    const tokenAAddress = "0xFa9f5b3FA32b95D5e14C7f0cAFe11D75654f7cf8";  // usdt address arbTestnet

    const l1PoolAddress = "0x0041C4C5e9038b43cC3fEeda1628A58a49cDb481";  // arbTestnet L1Pool地址
    // const l1PoolAddress = "0xd6E8Dd7034B1C6953B6Eb0ebE602b25C72A86655";  // baseMainnet L1Pool地址 
    // const l1PoolAddress = "0xd6E8Dd7034B1C6953B6Eb0ebE602b25C72A86655";  // Mainnet L1Pool地址 

    // const mockRouterAddress = "0x34D945acdEE382e6274ADbD88F89955dc27802E5";  // 替换为实际的 MockRouter 合约地址  
    // const mockRouterAddress = "0x079621c7d9AADAd9fE81930a4617bE6bF352e190";  // arbTestnet MockRouter 合约地址
    const mockRouterAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";  // baseMainnet 1inch 合约地址
    // 将已部署的合约地址进行 attach
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.attach(tokenAAddress);
    tokenB = await MockERC20.attach(tokenBAddress);
  
    console.log("TokenA attached at:", tokenA.address);
    console.log("TokenB attached at:", tokenB.address);
  
    const MockRouter = await ethers.getContractFactory("MockAggregationRouterV5");
    mockRouter = await MockRouter.attach(mockRouterAddress);
    console.log("MockRouter attached at:", mockRouter.address);
  
    const L1Pool = await ethers.getContractFactory("L1Pool");
    l1Pool = await L1Pool.attach(l1PoolAddress);
    console.log("L1Pool attached at:", l1Pool.address);
    console.log("===================初始化数据结束==========================");
  });
  

  // 测试 depositToPool 方法  场景一：测试存入原生代币（ETH）的情况  depositToPool
  it("Should allow user to deposit native token (ETH) into the pool with gas settings", async function () {
    const depositAmount = ethers.utils.parseEther("1");  // 1 ETH
    const formattedDepositAmount = ethers.utils.formatEther(depositAmount);
    console.log(`》》》测试内容：通过 depositToPool 往 L1Pool 合约中注入 ETH: ${formattedDepositAmount} ETH`);
    const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    await printBalances(l1Pool, addr1, tokens);
    // 打印 depositToPool 方法的入参
    console.log("DepositToPool Params - Token:", ethers.constants.AddressZero);
    console.log("DepositToPool Params - Amount:", depositAmount.toString());

    // 调用 depositToPool 存入原生代币（ETH）
    await expect(
      l1Pool.connect(addr1).depositToPool(ethers.constants.AddressZero, 0, {
        value: depositAmount,
        gasPrice: gasPrice,
        gasLimit: gasLimit
      })
    )
      .to.emit(l1Pool, "DepositToPool")
      .withArgs(addr1.address, ethers.constants.AddressZero, depositAmount);

    // 检查 poolBalances 中 ETH 的余额
    const poolBalance = await l1Pool.getPoolBalance(ethers.constants.AddressZero);
    // 打印 poolBalance
    console.log("ETH Pool Balance:", ethers.utils.formatEther(poolBalance));
    await printBalances(l1Pool, addr1, tokens);
  });

  // 测试 depositToPool 方法  场景二：测试 存入ERC20 TOKENA 代币的情况  depositToPool
  it("Should allow user to deposit ERC20 tokens into the pool with gas settings", async function () {
    const depositAmount = ethers.utils.parseUnits("100000",6);  // 100 TokenA
    const formattedDepositAmount = ethers.utils.formatUnits(depositAmount, 18);
    console.log(`》》》测试内容：通过 depositToPool 往 L1Pool 合约中注入 TokenA: ${formattedDepositAmount} TokenA`);
    // const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    // await printBalances(l1Pool, addr1, tokens);
    // 给 addr1 打入一些 tokenA 代币
    // const mintAmount = ethers.utils.parseUnits("50000",18);
    // await tokenA.mint(
    //   addr1.address, mintAmount,
    //   {
    //     gasPrice: gasPrice,
    //     gasLimit: gasLimit
    //   }
    // );
  
    // 检查 addr1 的 tokenA 余额是否正确

    const addr1TokenBalanceBefore = await tokenA.balanceOf(addr1.address);
    console.log("TokenA Balance of addr1 before deposit:", ethers.utils.formatUnits(addr1TokenBalanceBefore,6));

    // 打印 depositToPool 方法的入参
    console.log("DepositToPool Params - Token:", tokenA.address);
    console.log("DepositToPool Params - Amount:", depositAmount.toString());
  
    // 首先，批准合约消费 addr1 的 tokenA
    await tokenA.connect(addr1).approve(l1Pool.address, depositAmount);
  
    // 获取当前的 gas price
    const currentGasPrice = await ethers.provider.getGasPrice();
    console.log("Estimated Gas Price:", ethers.utils.formatUnits(currentGasPrice, "gwei"), "Gwei");

    // 调用 depositToPool 存入 ERC20 代币
    const tx = await l1Pool.connect(addr1).depositToPool(tokenA.address, depositAmount, {
      gasPrice: gasPrice,
      gasLimit: gasLimit
    });
    
    // 等待交易完成并获取交易的 receipt
    const receipt = await tx.wait();
    
    // 打印交易 hash
    console.log("Transaction hash:", receipt.transactionHash);
    
    // 使用 expect 进行事件断言
    await expect(tx)
      .to.emit(l1Pool, "DepositToPool")
      .withArgs(addr1.address, tokenA.address, depositAmount);
    
  
    // 检查 poolBalances[tokenA] 增加了 depositAmount
    const poolBalance = await l1Pool.getPoolBalance(tokenA.address);
    console.log("TokenA Pool Balance:", ethers.utils.formatEther(poolBalance));
  
    // 检查 addr1 的 tokenA 余额减少了 depositAmount
    const addr1TokenBalanceAfter = await tokenA.balanceOf(addr1.address);
    console.log("TokenA Balance of addr1 after deposit:", ethers.utils.formatEther(addr1TokenBalanceAfter));
    // await printBalances(l1Pool, addr1, tokens);
  });

  // 测试 depositToPool 方法  场景三：测试 存入ERC20 TOKENB 代币的情况  depositToPool
  it("Should allow user to deposit ERC20 tokens into the pool with gas settings", async function () {
    const depositAmount = ethers.utils.parseEther("100");  // 100 TokenB
    const formattedDepositAmount = ethers.utils.formatUnits(depositAmount, 18);
    console.log(`》》》测试内容：通过 depositToPool 往 L1Pool 合约中注入 TokenB: ${formattedDepositAmount} TokenB`);
    const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    await printBalances(l1Pool, addr1, tokens);
    // 给 addr1 打入一些 TokenB 代币
    const mintAmount = ethers.utils.parseEther("500");  // 500 TokenB
    await tokenB.mint(addr1.address, mintAmount);
  
    // 检查 addr1 的 TokenB 余额是否正确
    const addr1TokenBalanceBefore = await tokenB.balanceOf(addr1.address);
    console.log("TokenB Balance of addr1 before deposit:", ethers.utils.formatEther(addr1TokenBalanceBefore));
  
    // 打印 depositToPool 方法的入参
    console.log("DepositToPool Params - Token:", tokenB.address);
    console.log("DepositToPool Params - Amount:", depositAmount.toString());
  
    // 首先，批准合约消费 addr1 的 TokenB
    await tokenB.connect(addr1).approve(l1Pool.address, depositAmount);
  
    // 调用 depositToPool 存入 ERC20 代币
    await expect(
      l1Pool.connect(addr1).depositToPool(tokenB.address, depositAmount, {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      })
    )
      .to.emit(l1Pool, "DepositToPool")
      .withArgs(addr1.address, tokenB.address, depositAmount);
  
    // 检查 poolBalances[TokenB] 增加了 depositAmount
    const poolBalance = await l1Pool.getPoolBalance(tokenB.address);
    console.log("TokenB Pool Balance:", ethers.utils.formatEther(poolBalance));
  
    // 检查 addr1 的 TokenB 余额减少了 depositAmount
    const addr1TokenBalanceAfter = await tokenB.balanceOf(addr1.address);
    console.log("TokenB Balance of addr1 after deposit:", ethers.utils.formatEther(addr1TokenBalanceAfter));
    await printBalances(l1Pool, addr1, tokens);
  });







  // 测试 swapFromPool 方法 场景一兑换TokenA：原生代币（ETH）兑换 ERC20 代币  这里兑换的是TokenA,方便swapFromUser的方法测试  swapFromPool
  it("Should swap native token (ETH) to ERC20", async function () {
    const swapAmount = ethers.utils.parseUnits("2", 6);  // 1 ETH
    const feeAmount = ethers.utils.parseUnits("0.01", 6);
    const formattedSwapAmount = ethers.utils.formatEther(swapAmount);
    console.log(`》》》测试内容：调用 swapFromPool 方法，使用 ${formattedSwapAmount} ETH 按照 1:0.5 兑换 TokenA 代币`);
    const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    await printBalances(l1Pool, addr1, tokens);
    // 定义SwapDescription结构体
    const SwapDescription = {
        srcToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // 原生代币（ETH）
        dstToken: tokenA.address, // 目标资产（ERC20）
        srcReceiver: l1Pool.address, // 发送者地址
        dstReceiver: l1Pool.address, // 接收者地址
        amount: swapAmount, // 发送的ETH数量
        minReturnAmount: ethers.utils.parseUnits("0", 18), // 最少接收 ERC20 代币数量
        flags: 1
    };

    // 编码 exchangeData
    const encodedExchangeData = ethers.utils.defaultAbiCoder.encode(
        ["address", "tuple(address,address,address,address,uint256,uint256,uint256)", "bytes"],
        [
            "0x0000000000000000000000000000000000000000", // 1inch 或其他路由合约地址（可以留空）
            [
                SwapDescription.srcToken,
                SwapDescription.dstToken,
                SwapDescription.srcReceiver,
                SwapDescription.dstReceiver,
                SwapDescription.amount,
                SwapDescription.minReturnAmount,
                SwapDescription.flags
            ],
            "0x" // 额外数据
        ]
    );

    // 获取 swap 方法的函数选择器
    const functionSignature = ethers.utils.id("swap(address,(address,address,address,address,uint256,uint256,uint256),bytes)").slice(0, 10);

    // 合并函数签名和编码数据
    const exchangeData = functionSignature + encodedExchangeData.slice(2);

    // 调用 swapFromPool，使用 ETH 兑换 ERC20 代币
    try {
      const tx = await l1Pool.connect(addr1).swapFromPool(
        ethers.constants.AddressZero,  // 原生代币
        swapAmount,                    // 兑换的ETH数量
        mockRouter.address,            // 路由合约地址
        exchangeData,                  // 编码的交换数据
        addr1.address,                 // 用户地址
        feeAmount, // 假设手续费是 0.0001 ETH
        {
          gasPrice: gasPrice,
          gasLimit: gasLimit
        }
      );
  
      // 等待交易完成并打印交易 hash
      const receipt = await tx.wait();
      console.log("Transaction hash:", receipt.transactionHash);
  
      // 获取事件参数
      const event = receipt.events.find(e => e.event === "SwapFromPool");
      // console.log("SwapFromPool event args:", event.args);  // 打印事件的所有参数
      
      // 验证事件是否触发
      await expect(tx)
        .to.emit(l1Pool, "SwapFromPool")
        .withArgs(
          addr1.address,                     // 用户地址
          ethers.constants.AddressZero,      // 源代币地址（ETH）
          swapAmount.add(feeAmount),         // 输入的 ETH 数量
          tokenA.address,                    // 目标 ERC20 代币地址
          anyValue,                          // 不验证 returnAmount 参数
          anyValue,                          // 收取的手续费
          mockRouter.address                 // 路由合约地址
        );
    } catch (error) {
      console.log("Transaction failed with error:", error);
      if (error.transactionHash) {
        console.log("Transaction hash:", error.transactionHash);  // 打印失败交易的 hash
      }
    }

    // 验证用户是否获得了 ERC20 代币
    const userBalance = await l1Pool.getUserBalance(addr1.address, tokenA.address);
    console.log("User's tokenA balance after swap:", ethers.utils.formatUnits(userBalance, 18));
    await printBalances(l1Pool, addr1, tokens);
  });

  // 测试 swapFromPool 方法 场景一兑换TokenB：原生代币（ETH）兑换 ERC20 代币  这里兑换的是TokenB,方便swapFromUser的方法测试  swapFromPool
  it("Should swap native token (ETH) to ERC20", async function () {
    const swapAmount = ethers.utils.parseUnits("1", 6);  // 1 ETH
    const formattedSwapAmount = ethers.utils.formatEther(swapAmount);
    console.log(`》》》测试内容：调用 swapFromPool 方法，使用 ${formattedSwapAmount} ETH 按照 1:0.5 兑换 TokenB 代币`);
    const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    await printBalances(l1Pool, addr1, tokens);
    // 定义SwapDescription结构体
    const SwapDescription = {
        srcToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // 原生代币（ETH）
        dstToken: tokenB.address, // 目标资产（ERC20）
        srcReceiver: addr1.address, // 发送者地址
        dstReceiver: l1Pool.address, // 接收者地址
        amount: swapAmount, // 发送的ETH数量
        minReturnAmount: ethers.utils.parseUnits("0", 18), // 最少接收 ERC20 代币数量
        flags: 1
    };

    // 编码 exchangeData
    const encodedExchangeData = ethers.utils.defaultAbiCoder.encode(
        ["address", "tuple(address,address,address,address,uint256,uint256,uint256)", "bytes"],
        [
            "0x0000000000000000000000000000000000000000", // 1inch 或其他路由合约地址（可以留空）
            [
                SwapDescription.srcToken,
                SwapDescription.dstToken,
                SwapDescription.srcReceiver,
                SwapDescription.dstReceiver,
                SwapDescription.amount,
                SwapDescription.minReturnAmount,
                SwapDescription.flags
            ],
            "0x" // 额外数据
        ]
    );

    // 获取 swap 方法的函数选择器
    const functionSignature = ethers.utils.id("swap(address,(address,address,address,address,uint256,uint256,uint256),bytes)").slice(0, 10);

    // 合并函数签名和编码数据
    const exchangeData = functionSignature + encodedExchangeData.slice(2);

    // 调用 swapFromPool，使用 ETH 兑换 ERC20 代币
    await expect(
        l1Pool.connect(addr1).swapFromPool(
            ethers.constants.AddressZero,  // 原生代币
            swapAmount,
            mockRouter.address,
            exchangeData,
            addr1.address,
            ethers.utils.parseEther("0.1"), // 假设手续费是 0.1 ETH
            {
              // value: swapAmount, // 传递 ETH 作为交换金额,直接用L1pool合约里的eth兑换，不能从钱包里转eth到L1pool合约中
              gasLimit: gasLimit,
              gasPrice: gasPrice
            }
        )
    ).to.emit(l1Pool, "SwapFromPool")
    .withArgs(
      addr1.address,   // 用户地址
      ethers.constants.AddressZero,  // 源代币地址（ETH）
      swapAmount,   // 输入的 ETH 数量
      tokenB.address,  // 目标 ERC20 代币地址
      anyValue,// 不验证 returnAmount 参数，稍后在 .then() 中处理
      ethers.utils.parseEther("0.1"), // 收取的手续费
      mockRouter.address  // 路由合约地址
    );
    // .then((receipt) => {
    //   // 获取事件中的 returnAmount
    //   const event = receipt.events.find((event) => event.event === "SwapFromPool");
    //   const returnAmount = event.args.dstAmount;

    //   // 验证 returnAmount 是否与 swapAmount 相等
    //   console.log("Actual returnAmount:", ethers.utils.formatEther(returnAmount));
    // });

    // 验证用户是否获得了 ERC20 代币
    const userBalance = await l1Pool.getUserBalance(addr1.address, tokenB.address);
    console.log("User's tokenB balance after swap:", ethers.utils.formatUnits(userBalance, 18));
    await printBalances(l1Pool, addr1, tokens);
  });

  // 测试 swapFromPool 方法 场景二：ERC20 代币兑换原生代币（ETH） swapFromPool
  it("Should swap ERC20 token (TokenA) to native token (ETH)", async function () {
    const swapAmount = ethers.utils.parseUnits("100", 12);  // 100 TokenA
    const formattedSwapAmount = ethers.utils.formatEther(swapAmount);
    console.log(`》》》测试内容：调用 swapFromPool 方法，使用 ${formattedSwapAmount} TokenA 按照 100:1 兑换 ETH`);

    const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    await printBalances(l1Pool, addr1, tokens);

    // 定义SwapDescription结构体
    const SwapDescription = {
        srcToken: tokenA.address,  // 源代币（ERC20）
        dstToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",  // 目标资产（ETH）
        srcReceiver: l1Pool.address,  // 发送者地址
        dstReceiver: l1Pool.address,  // 接收者地址
        amount: swapAmount,  // 发送的 TokenA 数量
        minReturnAmount: ethers.utils.parseUnits("0", 18),  // 最少接收 ETH 的数量
        flags: 1
    };

    // 编码 exchangeData
    const encodedExchangeData = ethers.utils.defaultAbiCoder.encode(
      ["address", "tuple(address,address,address,address,uint256,uint256,uint256)", "bytes"],
      [
        "0x0000000000000000000000000000000000000000",  // 1inch 或其他路由合约地址
        [
          SwapDescription.srcToken,
          SwapDescription.dstToken,
          SwapDescription.srcReceiver,
          SwapDescription.dstReceiver,
          SwapDescription.amount,
          SwapDescription.minReturnAmount,
          SwapDescription.flags
        ],
        "0x"  // 额外数据
      ]
    );

    // 获取 swap 方法的函数选择器
    const functionSignature = ethers.utils.id("swap(address,(address,address,address,address,uint256,uint256,uint256),bytes)").slice(0, 10);

    // 合并函数签名和编码数据
    const exchangeData = functionSignature + encodedExchangeData.slice(2);

    // 批准合约消费用户的 ERC20 代币 无需授权，兑换的代币是L1Pool合约里的资金池中代币
    // await tokenA.connect(addr1).approve(l1Pool.address, swapAmount);
    // console.log(`用户 ${addr1.address} 已授权 L1Pool 合约消费 ${formattedSwapAmount} TokenA`);

    // 调用 swapFromPool，使用 ERC20 代币兑换 ETH
    await expect(
      l1Pool.connect(addr1).swapFromPool(
        tokenA.address,  // 源代币（TokenA）
        swapAmount,
        mockRouter.address,
        exchangeData,
        addr1.address,  // 用户地址
        ethers.utils.parseUnits("1", 12),  // 假设手续费是 0.1 ETH
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      )
    ).to.emit(l1Pool, "SwapFromPool")
      .withArgs(
        addr1.address,   // 用户地址
        tokenA.address,  // 源代币地址（TokenA）
        anyValue,   // 输入的 TokenA 数量 swapAmount
        ethers.constants.AddressZero,  // 目标资产地址（ETH）
        anyValue,  // 不验证 returnAmount 参数，稍后在 .then() 中处理
        anyValue,  // 收取的手续费
        mockRouter.address  // 路由合约地址
      );

    // 验证用户的原生代币余额
    const userNativeBalance = await ethers.provider.getBalance(addr1.address);
    console.log(`用户 ${addr1.address} 的 ETH 余额（兑换后）: ${ethers.utils.formatEther(userNativeBalance)} ETH`);

    await printBalances(l1Pool, addr1, tokens);
  });

  // 测试 swapFromPool 方法 场景三：L1Pool 合约中存储的 ERC20 代币兑换另一种 ERC20 代币  swapFromPool
  it("Should swap ERC20 token to another ERC20 token using L1Pool's tokenA", async function () {
    const swapAmount = ethers.utils.parseUnits("1", 6);
    const fee = ethers.utils.parseUnits("1", 6); // 假设手续费是 1 USDT
    const minReturnAmount = ethers.utils.parseUnits("30000", 6); 
    const formattedSwapAmount = ethers.utils.formatUnits(swapAmount, 18);
    console.log(`》》》测试内容：调用 swapFromPool 方法，使用 ${formattedSwapAmount} 个 tokenA 兑换 TokenB 代币`);

    const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    await printBalances(l1Pool, addr1, tokens);

    // 生成一个唯一的 orderId，假设这里直接使用区块时间戳来作为 orderId
    const orderId = Math.floor(Date.now() / 1000);

    // 设置过期时间，假设设置为 5 分钟后
    const expireTime = Math.floor(Date.now() / 1000) + 300;

    // 定义SwapDescription结构体
    const SwapDescription = {
      srcToken: tokenA.address, // 源代币 tokenA
      dstToken: tokenB.address, // 目标代币 tokenB
      srcReceiver: l1Pool.address, // 发送者是 L1Pool 合约
      dstReceiver: l1Pool.address, // 接收者是 L1Pool 合约
      amount: swapAmount, // 要交换的 tokenA 数量
      minReturnAmount: minReturnAmount, // 预期最小的 tokenB 数量
      flags: 1
    };

    // 编码 exchangeData
    const encodedExchangeData = ethers.utils.defaultAbiCoder.encode(
      ["address", "tuple(address,address,address,address,uint256,uint256,uint256)", "bytes"],
      [
        "0x0000000000000000000000000000000000000000", // 路由合约地址
        [
          SwapDescription.srcToken,
          SwapDescription.dstToken,
          SwapDescription.srcReceiver,
          SwapDescription.dstReceiver,
          SwapDescription.amount,
          SwapDescription.minReturnAmount,
          SwapDescription.flags
        ],
        "0x" // 额外数据
      ]
    );

    // 获取 swap 方法的函数选择器
    const functionSignature = ethers.utils.id("swap(address,(address,address,address,address,uint256,uint256,uint256),bytes)").slice(0, 10);

    // 合并函数签名和编码数据
    const exchangeData = functionSignature + encodedExchangeData.slice(2);

    // 调用 swapFromPool，使用 L1Pool 合约中的 tokenA 兑换 tokenB
    try {
      const tx = await l1Pool.connect(addr1).swapFromPool(
        tokenA.address,   // 源代币 tokenA
        swapAmount,       // 要交换的 tokenA 数量
        mockRouter.address,  // 路由合约地址
        exchangeData,     // 编码后的交换数据
        addr1.address,    // 用户地址
        fee,              // 手续费
        expireTime,       // 过期时间
        orderId,          // 唯一订单 ID
        {
          gasLimit: gasLimit,   // 设置 gas 限制
          gasPrice: gasPrice    // 设置 gas 价格
        }
      );
    
      // 等待交易完成并获取交易结果
      const receipt = await tx.wait();
    
      // 打印交易 hash
      console.log("Transaction successful! Hash:", receipt.transactionHash);
    
      // 验证事件是否正确发出
      await expect(Promise.resolve(tx))
        .to.emit(l1Pool, "SwapFromPool")
        .withArgs(
          addr1.address,   // 用户地址
          tokenA.address,  // 源代币地址
          swapAmount.add(fee),        // 输入的 tokenA 数量
          tokenB.address,  // 目标 ERC20 代币地址
          anyValue,        // 不验证 returnAmount 参数，稍后在 .then() 中处理
          fee,             // 收取的手续费
          orderId          // 唯一订单 ID
        );
    
    } catch (error) {
      // 捕获错误并打印交易 hash
      if (error.transactionHash) {
        console.log("Transaction failed! Hash:", error.transactionHash);
      } else {
        console.log("Transaction failed without transactionHash:", error);
      }
    }

    // 验证用户是否获得了另一种 ERC20 代币
    const userBalance = await l1Pool.getUserBalance(addr1.address, tokenB.address); // 验证的是 tokenB 的余额
    console.log(`User's tokenB balance after swap: ${ethers.utils.formatUnits(userBalance, 18)}`);

    // 再次打印 L1Pool 和用户的余额
    await printBalances(l1Pool, addr1, tokens);
  });
  
  it("Should swap ERC20 token to another ERC20 token using L1Pool's tokenA with real 1inch exchangeData", async function () {
      const swapAmount = ethers.utils.parseUnits("1", 6);  // 假设 tokenA 和 tokenB 均是6位小数的代币
      const fee = ethers.utils.parseUnits("0.0001", 6);  // 假设手续费是 1 USDT
      const minReturnAmount = ethers.utils.parseUnits("30000", 6); 
      console.log(`》》》测试内容：调用 swapFromPool 方法，使用 ${ethers.utils.formatUnits(swapAmount, 6)} 个 tokenA 兑换 TokenB 代币`);
  
      // const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
      // await printBalances(l1Pool, addr1, tokens);
  
      const orderId = Math.floor(Date.now() / 1000); // 生成唯一的 orderId
      const expireTime = Math.floor(Date.now() / 1000) + 300;  // 设置过期时间为5分钟后
  
      // 发出 HTTP 请求获取 1inch 的 exchangeData
      const apiUrl = `https://api.1inch.dev/swap/v5.2/8453/swap?src=${tokenA.address}&dst=${tokenB.address}&compatibility=true&amount=${swapAmount}&receiver=${l1Pool.address}&disableEstimate=true&from=${l1Pool.address}&slippage=0.5`;
  
      let exchangeData;
      try {
          const response = await axios.get(apiUrl, {
              headers: {
                  'Authorization': 'Bearer BrEh30cx4zQ4v0fRt3SsWginjc7NFEw6',  // 添加你的 Bearer Token
                  'accept': 'application/json'  // 设置接受 JSON 响应
              }
          });
          exchangeData = response.data.tx.data;  // 获取 1inch API 返回的 `exchangeData`
          console.log("Received exchangeData from 1inch API:", exchangeData);
      } catch (error) {
          console.error("Error fetching exchangeData from 1inch API:", error);
          return;
      }
  
      try {
        const tx = await l1Pool.connect(addr1).swapFromPool(
          tokenA.address,   // 源代币 tokenA
          swapAmount,       // 要交换的 tokenA 数量
          mockRouter.address,  // 路由合约地址，假设你已部署了 mockRouter
          exchangeData,     // 从1inch API获取的真实交换数据
          addr1.address,    // 用户地址
          fee,              // 手续费
          expireTime,       // 过期时间
          orderId,          // 唯一订单 ID
          {
            gasLimit: gasLimit,   // 设置 gas 限制
            gasPrice: gasPrice    // 设置 gas 价格
          }
        );
      
        const receipt = await tx.wait();
        console.log("Transaction successful! Hash:", receipt.transactionHash);
  
        await expect(Promise.resolve(tx))
          .to.emit(l1Pool, "SwapFromPool")
          .withArgs(
            addr1.address,   // 用户地址
            tokenA.address,  // 源代币地址
            swapAmount.add(fee),        // 输入的 tokenA 数量
            tokenB.address,  // 目标 ERC20 代币地址
            anyValue,        // 不验证 returnAmount 参数
            fee,             // 收取的手续费
            orderId          // 唯一订单 ID
          );
      
      } catch (error) {
        if (error.transactionHash) {
          console.log("Transaction failed! Hash:", error.transactionHash);
        } else {
          console.log("Transaction failed without transactionHash:", error);
        }
      }
  
      const userBalance = await l1Pool.getUserBalance(addr1.address, tokenB.address); 
      console.log(`User's tokenB balance after swap: ${ethers.utils.formatUnits(userBalance, 6)}`);
  
      // await printBalances(l1Pool, addr1, tokens);
    });

  it("Should swap ERC20 token to another ERC20 token using L1Pool's tokenA with real 1inch exchangeData", async function () {
    // 设置必要的参数
    const swapAmount = ethers.utils.parseUnits("10", 6);  // 使用你的 srcAmount (10 USDT)
    const fee = ethers.utils.parseUnits("0.053547", 6);  // 使用你的 totalFee (0.053547 USDT)
    const platformFee = ethers.utils.parseUnits("0.049987", 6);  // 使用 platformFee (0.049987 USDT)
  
    console.log(`》》》测试内容：调用 swapFromPool 方法，使用 ${ethers.utils.formatUnits(swapAmount, 6)} 个 USDT 兑换 USDC 代币`);
  
    // 定义代币地址
    const srcToken = "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2";  // 源代币 USDT 地址
    const dstToken = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";  // 目标代币 USDC 地址
  
    // 设置唯一订单 ID 和过期时间
    const orderId = Math.floor(Date.now() / 1000); // 生成唯一的 orderId
    const expireTime = Math.floor(Date.now() / 1000) + 300;  // 设置过期时间为5分钟后
  
    // 直接使用提供的 exchangeData 和路由器地址
    const exchangeData = "0x12aa3caf000000000000000000000000e37e799d5077682fa0a244d46e5649f71457bd09000000000000000000000000fde4c96c8593536e31f229ea8f37b2ada2699bb2000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000e37e799d5077682fa0a244d46e5649f71457bd09000000000000000000000000d6e8dd7034b1c6953b6eb0ebe602b25c72a86655000000000000000000000000000000000000000000000000000000000097c57c00000000000000000000000000000000000000000000000000000000004bd9020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000009b00000000000000000000000000000000000000000000000000007d00001a0020d6bdbf78fde4c96c8593536e31f229ea8f37b2ada2699bb202a00000000000000000000000000000000000000000000000000000000000000001ee63c1e5805f07bb9fee6062e9d09a52e6d587c64bad6ba706fde4c96c8593536e31f229ea8f37b2ada2699bb21111111254eeb25477b68fb85ed929f73a9605820000000000cde999fc";
  
    try {
      // 调用 swapFromPool 函数
      const tx = await l1Pool.connect(addr1).swapFromPool(
        srcToken,          // 源代币 USDT 地址
        swapAmount,        // 要交换的 USDT 数量
        mockRouter.address, // 路由合约地址
        exchangeData,      // 使用提供的 exchangeData
        addr1.address,     // 用户地址
        fee,               // 手续费
        expireTime,        // 过期时间
        orderId,           // 唯一订单 ID
        {
          gasLimit: 371962,   // 使用提供的估算的 gasLimit
          gasPrice: ethers.utils.parseUnits("0.004", "gwei")  // 使用提供的 gasFee
        }
      );
      
      // 等待交易完成
      const receipt = await tx.wait();
      console.log("Transaction successful! Hash:", receipt.transactionHash);
  
      // 验证事件是否正确发出
      await expect(Promise.resolve(tx))
        .to.emit(l1Pool, "SwapFromPool")
        .withArgs(
          addr1.address,   // 用户地址
          srcToken,        // 源代币地址
          swapAmount.add(fee),  // 输入的代币数量加上手续费
          dstToken,        // 目标代币地址
          anyValue,        // 不验证 returnAmount 参数
          fee,             // 收取的手续费
          orderId          // 唯一订单 ID
        );
  
    } catch (error) {
      // 捕获并打印错误信息
      if (error.transactionHash) {
        console.log("Transaction failed! Hash:", error.transactionHash);
      } else {
        console.log("Transaction failed without transactionHash:", error);
      }
    }
  
    // 验证用户的目标代币 USDC 的余额是否增加
    const userBalance = await l1Pool.getUserBalance(addr1.address, dstToken);
    console.log(`User's USDC balance after swap: ${ethers.utils.formatUnits(userBalance, 6)}`);
  
    // 打印交易后的余额 (可选)
    // await printBalances(l1Pool, addr1, [srcToken, dstToken]);
  });




  // 测试 swapFromUser 场景一：原生代币（ETH）兑换 ERC20 代币  swapFromUser
  it("Should swap native token (ETH) to ERC20 token using L1Pool's ETH", async function () {
    const swapAmount = ethers.utils.parseUnits("2",12);  // 1 ETH
    const formattedSwapAmount = ethers.utils.formatEther(swapAmount);

    console.log(`》》》测试内容：调用 swapFromUser 方法，使用 L1Pool 合约中的 ${formattedSwapAmount} ETH 按照 1:2 兑换 tokenA 代币`);

    // 打印初始余额
    const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    await printBalances(l1Pool, addr1, tokens);

    // 定义 SwapDescription 结构体
    const SwapDescription = {
      srcToken: ethers.constants.AddressZero, // 原生代币（ETH）
      dstToken: tokenA.address, // 目标资产（ERC20）
      srcReceiver: l1Pool.address, // 发送者地址
      dstReceiver: l1Pool.address, // 接收者地址
      amount: swapAmount, // 发送的 ETH 数量
      minReturnAmount: ethers.utils.parseUnits("0", 18), // 最少接收 ERC20 代币数量
      flags: 1
    };

    // 编码 exchangeData
    const encodedExchangeData = ethers.utils.defaultAbiCoder.encode(
      ["address", "tuple(address,address,address,address,uint256,uint256,uint256)", "bytes"],
      [
        "0x0000000000000000000000000000000000000000", // 1inch 或其他路由合约地址（可以留空）
        [
          SwapDescription.srcToken,
          SwapDescription.dstToken,
          SwapDescription.srcReceiver,
          SwapDescription.dstReceiver,
          SwapDescription.amount,
          SwapDescription.minReturnAmount,
          SwapDescription.flags
        ],
        "0x" // 额外数据
      ]
    );

    // 获取 swap 方法的函数选择器
    const functionSignature = ethers.utils.id("swap(address,(address,address,address,address,uint256,uint256,uint256),bytes)").slice(0, 10);

    // 合并函数签名和编码数据
    const exchangeData = functionSignature + encodedExchangeData.slice(2);

    // 调用 swapFromUser 方法，使用 L1Pool 合约中的 ETH 兑换 ERC20 代币
    await expect(
      l1Pool.connect(addr1).swapFromUser(
        ethers.constants.AddressZero,  // 使用 L1Pool 中的原生代币（ETH）
        swapAmount,
        mockRouter.address,
        exchangeData,
        addr1.address,
        ethers.utils.parseUnits("1",12), // 假设手续费是 0.1 ETH
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      )
    ).to.emit(l1Pool, "SwapFromUser")
      .withArgs(
        addr1.address,   // 用户地址
        ethers.constants.AddressZero,  // 源代币地址（ETH）
        swapAmount,   // 输入的 ETH 数量
        tokenA.address,  // 目标 ERC20 代币地址
        anyValue,  // 不验证 returnAmount 参数，稍后在 .then() 中处理
        anyValue, // 收取的手续费
        mockRouter.address  // 路由合约地址
      );

    // 验证用户是否获得了 ERC20 代币
    const userBalance = await l1Pool.getUserBalance(addr1.address, tokenA.address);
    console.log("User's tokenA balance after swap:", ethers.utils.formatUnits(userBalance, 18));

    // 打印兑换后的余额
    await printBalances(l1Pool, addr1, tokens);
  });

  // 测试 swapFromUser 场景二：ERC20 代币兑换原生代币（ETH） swapFromUser
  it("Should swap ERC20 token to native token (ETH)", async function () {
    const swapAmount = ethers.utils.parseUnits("1",6);  // 100 ERC20 代币
    const feeAmount = ethers.utils.parseUnits("2",4); // 手续费
    const formattedSwapAmount = ethers.utils.formatEther(swapAmount);

    console.log(`》》》测试内容：调用 swapFromUser 方法，使用 L1Pool 合约中的 ${formattedSwapAmount} TokenA 代币兑换 ETH`);

    // 打印初始余额
    const tokens = [ethers.constants.AddressZero, tokenA.address];
    await printBalances(l1Pool, addr1, tokens);

    // 定义 SwapDescription 结构体
    const SwapDescription = {
      srcToken: tokenA.address, // ERC20 代币
      dstToken: ethers.constants.AddressZero, // 目标资产（ETH）
      srcReceiver: l1Pool.address, // 发送者地址
      dstReceiver: l1Pool.address, // 接收者地址
      amount: swapAmount, // 发送的 TokenA 数量
      minReturnAmount: ethers.utils.parseUnits("0", 18), // 最少接收 ETH 数量
      flags: 1
    };

    // 编码 exchangeData
    const encodedExchangeData = ethers.utils.defaultAbiCoder.encode(
      ["address", "tuple(address,address,address,address,uint256,uint256,uint256)", "bytes"],
      [
        "0x0000000000000000000000000000000000000000", // 1inch 或其他路由合约地址
        [
          SwapDescription.srcToken,
          SwapDescription.dstToken,
          SwapDescription.srcReceiver,
          SwapDescription.dstReceiver,
          SwapDescription.amount,
          SwapDescription.minReturnAmount,
          SwapDescription.flags
        ],
        "0x" // 额外数据
      ]
    );

    // 获取 swap 方法的函数选择器
    const functionSignature = ethers.utils.id("swap(address,(address,address,address,address,uint256,uint256,uint256),bytes)").slice(0, 10);
    const exchangeData = functionSignature + encodedExchangeData.slice(2);

    try {
      // 调用 swapFromUser 方法
      const tx = await l1Pool.connect(addr1).swapFromUser(
        tokenA.address,  // 使用 L1Pool 中的 ERC20 代币
        swapAmount,
        mockRouter.address,
        exchangeData,
        addr1.address,
        feeAmount, // 手续费是 0.01 ETH
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      );

      // 等待交易完成
      const receipt = await tx.wait();
      console.log("Transaction succeeded with hash:", receipt.transactionHash);

      // 断言事件
      await expect(tx)
        .to.emit(l1Pool, "SwapFromUser")
        .withArgs(
          addr1.address,   // 用户地址
          tokenA.address,  // 源代币地址（TokenA）
          swapAmount,      // 输入的 TokenA 数量
          ethers.constants.AddressZero,  // 目标 ERC20 代币地址（ETH）
          anyValue,        // returnAmount 验证自动完成
          feeAmount,       // 手续费
          mockRouter.address  // 路由合约地址
        );

    } catch (error) {
      console.log("Transaction failed with error:", error);
    }

    // 打印兑换后的余额
    await printBalances(l1Pool, addr1, tokens);
  });

  // 测试 swapFromUser 场景三：ERC20 代币兑换另一种 ERC20 代币  swapFromUser
  it("Should swap ERC20 token to another ERC20 token", async function () {
    const swapAmount = ethers.utils.parseUnits("2", 6);  // 2 TokenB (例如 USDT)
    const fee = ethers.utils.parseUnits("1", 3); // 手续费是 1000 wei USDT
    const minReturnAmount = ethers.utils.parseUnits("300", 6);
    const formattedSwapAmount = ethers.utils.formatEther(swapAmount);

    console.log(`》》》测试内容：调用 swapFromUser 方法，使用 L1Pool 合约中的 ${formattedSwapAmount} TokenB 代币兑换 TokenA`);

    // 打印初始余额
    const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    await printBalances(l1Pool, addr1, tokens);

    // 定义过期时间和 orderId
    const orderId = Math.floor(Date.now() / 1000); // 使用时间戳作为 orderId
    const expireTime = Math.floor(Date.now() / 1000) + 300; // 设置过期时间为当前时间加5分钟

    // 定义 SwapDescription 结构体
    const SwapDescription = {
      srcToken: tokenB.address, // 源 ERC20 代币 B
      dstToken: tokenA.address, // 目标 ERC20 代币 A
      srcReceiver: l1Pool.address, // 发送者地址
      dstReceiver: l1Pool.address, // 接收者地址
      amount: swapAmount, // 发送的 TokenB 数量
      minReturnAmount: minReturnAmount, // 最少接收的 TokenA 数量
      flags: 1
    };

    // 编码 exchangeData
    const encodedExchangeData = ethers.utils.defaultAbiCoder.encode(
      ["address", "tuple(address,address,address,address,uint256,uint256,uint256)", "bytes"],
      [
        "0x0000000000000000000000000000000000000000", // 1inch 或其他路由合约地址
        [
          SwapDescription.srcToken,
          SwapDescription.dstToken,
          SwapDescription.srcReceiver,
          SwapDescription.dstReceiver,
          SwapDescription.amount,
          SwapDescription.minReturnAmount,
          SwapDescription.flags
        ],
        "0x" // 额外数据
      ]
    );

    // 获取 swap 方法的函数选择器
    const functionSignature = ethers.utils.id("swap(address,(address,address,address,address,uint256,uint256,uint256),bytes)").slice(0, 10);
    const exchangeData = functionSignature + encodedExchangeData.slice(2);

    try {
      // 调用 swapFromUser 方法
      const tx = await l1Pool.connect(addr1).swapFromUser(
        tokenB.address,  // 使用 L1Pool 中的 ERC20 代币 B
        swapAmount,      // 交换的 TokenB 数量
        mockRouter.address, // 路由合约地址
        exchangeData,    // 交换数据
        addr1.address,   // 用户地址
        fee,             // 手续费
        expireTime,      // 过期时间
        orderId,         // 唯一订单 ID
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      );
    
      // 验证事件是否正确发出
      await expect(tx)
      .to.emit(l1Pool, "SwapFromUser")
      .withArgs(
        addr1.address,   // 用户地址
        tokenB.address,  // 源代币地址
        anyValue,        // 输入的 tokenB 数量（swapAmount）
        tokenA.address,  // 目标代币地址
        anyValue,        // 不验证 returnAmount 参数
        fee,             // 手续费
        orderId          // 唯一订单 ID
      );

      // 等待交易完成并获取交易结果
      const receipt = await tx.wait();
    
      // 打印成功的交易 hash
      console.log("Transaction successful! Hash:", receipt.transactionHash);
    
    } catch (error) {
      // 如果交易失败，打印错误信息
      if (error.transactionHash) {
        console.log("Transaction failed! Hash:", error.transactionHash);
      } else {
        console.log("Transaction failed without transactionHash:", error);
      }
    }
    
    // 打印兑换后的余额
    await printBalances(l1Pool, addr1, tokens);
  });












  // 测试 omniTransferToSpot 方法   从 omni 账户,划转 ERC20 到 spot 账户  omniTransferToSpot
  it("Should perform omniTransferToSpot using ERC20 tokens from L1Pool", async function () {
    const transferAmount = ethers.utils.parseUnits("50", 6);  // 500 TokenA (6位精度)
    const feeAmount = ethers.utils.parseUnits("1", 6);         // 1 TokenA as fee (6位精度)
    const zkLinkAddress = ethers.utils.hexZeroPad("0x837b4bb0486ee6e9122bbc2a832cbb0285859b7a", 32);

    // 定义过期时间和 orderId
    const orderId = Math.floor(Date.now() / 1000); // 使用当前时间戳作为 orderId
    const expireTime = Math.floor(Date.now() / 1000) + 300; // 设置过期时间为当前时间加5分钟

    // 打印初始余额
    const userBalanceBefore = await l1Pool.getUserBalance(addr1.address, tokenA.address);
    const poolBalanceBefore = await l1Pool.getPoolBalance(tokenA.address);
    const feeBalanceBefore = await l1Pool.getFeeBalance(tokenA.address);
    const realTokenABalanceBefore = await tokenA.balanceOf(l1Pool.address); // 合约中的真实 TokenA 余额

    console.log("==== Initial Balances ====");
    console.log("User's TokenA balance in L1Pool (before userBalance):", ethers.utils.formatUnits(userBalanceBefore, 6));
    console.log("L1Pool TokenA balance (before poolBalance):", ethers.utils.formatUnits(poolBalanceBefore, 6));
    console.log("Fee TokenA balance in L1Pool (before feeBalance):", ethers.utils.formatUnits(feeBalanceBefore, 6));
    console.log("L1Pool real TokenA balance (before contract):", ethers.utils.formatUnits(realTokenABalanceBefore, 6)); // 真实的 TokenA 余额

    try {
      // 调用 omniTransferToSpot 方法
      const tx = await l1Pool.connect(addr1).omniTransferToSpot(
        tokenA.address,          // 使用的代币
        transferAmount,          // 转移金额
        zkLinkAddress,           // zkLink 地址
        addr1.address,           // 用户地址
        feeAmount,               // 手续费
        expireTime,              // 过期时间
        orderId,                 // 唯一订单 ID
        {
          gasLimit,
          gasPrice
        }
      );
    
      // 等待交易完成并获取交易结果
      const receipt = await tx.wait();
      
      // 打印交易 hash
      console.log("Transaction hash:", receipt.transactionHash);
      
    } catch (error) {
      if (error.transactionHash) {
        console.log("Failed transaction hash:", error.transactionHash);
      } else if (error.transaction && error.transaction.hash) {
        console.log("Failed transaction hash:", error.transaction.hash);
      } else {
        console.log("No transaction hash available in the error object.");
      }
    }

    // 打印转移后的余额
    const userBalanceAfter = await l1Pool.getUserBalance(addr1.address, tokenA.address);
    const poolBalanceAfter = await l1Pool.getPoolBalance(tokenA.address);
    const feeBalanceAfter = await l1Pool.getFeeBalance(tokenA.address);
    const realTokenABalanceAfter = await tokenA.balanceOf(l1Pool.address); // 合约中的真实 TokenA 余额

    console.log("==== Balances After Transfer ====");
    console.log("User's TokenA balance in L1Pool (after userBalance):", ethers.utils.formatUnits(userBalanceAfter, 6));
    console.log("L1Pool TokenA balance (after poolBalance):", ethers.utils.formatUnits(poolBalanceAfter, 6));
    console.log("Fee TokenA balance in L1Pool (after feeBalance):", ethers.utils.formatUnits(feeBalanceAfter, 6));
    console.log("L1Pool real TokenA balance (after realTokenABalance):", ethers.utils.formatUnits(realTokenABalanceAfter, 6)); // 打印真实的 TokenA 余额
  });

  // 测试 omniTransferToSpot 方法   从 omni 账户,划转 ETH 到 spot 账户  omniTransferToSpot
  it("Should perform omniTransferToSpot using ETH from L1Pool", async function () {
    const transferAmount = ethers.utils.parseEther("0.00002");  // 0.5 ETH
    const feeAmount = ethers.utils.parseEther("0.00000001");    // 0.1 ETH as fee
    const zkLinkAddress = ethers.utils.hexZeroPad("0x837b4bb0486ee6e9122bbc2a832cbb0285859b7a", 32);

    // 给 L1Pool 合约转入 10 ETH 供测试使用
    // await l1Pool.connect(addr1).depositToPool(ethers.constants.AddressZero, { value: transferAmount.add(feeAmount) });

    // 打印初始余额
    const userBalanceBefore = await l1Pool.getUserBalance(addr1.address, ethers.constants.AddressZero);
    const poolBalanceBefore = await l1Pool.getPoolBalance(ethers.constants.AddressZero);
    const feeBalanceBefore = await l1Pool.getFeeBalance(ethers.constants.AddressZero);
    // 获取合约的真实 ETH 余额
    const realEthBalanceBefore = await ethers.provider.getBalance(l1Pool.address);

    console.log("==== Initial Balances ====");
    console.log("User's ETH balance in L1Pool (before userBalance):", ethers.utils.formatEther(userBalanceBefore));
    console.log("L1Pool ETH balance (before poolBalance):", ethers.utils.formatEther(poolBalanceBefore));
    console.log("Fee ETH balance in L1Pool (before feeBalance):", ethers.utils.formatEther(feeBalanceBefore));
    console.log("L1Pool real ETH balance (before contract):", ethers.utils.formatEther(realEthBalanceBefore));

    // 执行 omniTransferToSpot 方法
    const tx = await l1Pool.connect(addr1).omniTransferToSpot(
        ethers.constants.AddressZero,  // 使用 ETH
        transferAmount,                // 转移金额
        zkLinkAddress,                 // zkLink 地址
        addr1.address,                 // 用户地址
        feeAmount,                      // 手续费
        {
          gasLimit:gasLimit,
          gasPrice:gasPrice
        }
      );
      

    // 等待交易完成并获取交易结果
    const receipt = await tx.wait();

    // 打印交易 hash
    console.log("Transaction hash:", receipt.transactionHash);

    await expect(tx).to.emit(l1Pool, "OmniTransferToSpot")
    .withArgs(addr1.address, ethers.constants.AddressZero, anyValue, zkLinkAddress, feeAmount);

    // 打印转移后的余额
    const userBalanceAfter = await l1Pool.getUserBalance(addr1.address, ethers.constants.AddressZero);
    const poolBalanceAfter = await l1Pool.getPoolBalance(ethers.constants.AddressZero);
    const feeBalanceAfter = await l1Pool.getFeeBalance(ethers.constants.AddressZero);
    // 获取合约的真实 ETH 余额
    const realEthBalanceAfter = await ethers.provider.getBalance(l1Pool.address);

    console.log("==== Balances After Transfer ====");
    console.log("User's ETH balance in L1Pool (after userBalance):", ethers.utils.formatEther(userBalanceAfter));
    console.log("L1Pool ETH balance (after poolBalance):", ethers.utils.formatEther(poolBalanceAfter));
    console.log("Fee ETH balance in L1Pool (after feeBalance):", ethers.utils.formatEther(feeBalanceAfter));
    console.log("L1Pool real ETH balance (after contract):", ethers.utils.formatEther(realEthBalanceAfter));
  });

















  // 测试 用户提现到钱包 userWithdraw
  it("Should allow user to withdraw ERC20 tokens from the pool", async function () {
    const withdrawAmount = ethers.utils.parseUnits("10", 6);  // 需要提现的 ERC20 TokenA 数量
    const feeAmount = ethers.utils.parseUnits("3", 3);  // 手续费的数量
    
    // 定义过期时间和 orderId
    const orderId = Math.floor(Date.now() / 1000); // 使用时间戳作为 orderId
    const expireTime = Math.floor(Date.now() / 1000) + 300; // 设置过期时间为当前时间加5分钟

    // 打印初始余额
    const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    await printBalances(l1Pool, addr1, tokens);

    // 获取 addr1 提现前的 TokenA 余额
    const addr1TokenABalanceBefore = await tokenA.balanceOf(addr1.address);
    console.log(`Address ${addr1.address} TokenA balance before withdraw:`, ethers.utils.formatUnits(addr1TokenABalanceBefore, 6));
  
    // 调用合约进行提现
    await expect(
      l1Pool.connect(addr1).userWithdraw(
        addr1.address,        // 用户钱包地址
        tokenA.address,       // 提现的代币地址
        withdrawAmount,       // 提现的数量
        feeAmount,            // 手续费
        expireTime,           // 过期时间
        orderId               // 唯一订单 ID
      )
    ).to.emit(l1Pool, "UserWithdraw")
    //  .withArgs(addr1.address, tokenA.address, withdrawAmount.add(feeAmount), feeAmount);
  
    // 获取 addr1 提现后的 TokenA 余额
    const addr1TokenABalanceAfter = await tokenA.balanceOf(addr1.address);
    console.log(`Address ${addr1.address} TokenA balance after withdraw:`, ethers.utils.formatUnits(addr1TokenABalanceAfter, 6));

    // 打印提现后的余额
    await printBalances(l1Pool, addr1, tokens);
  });

  // 测试从池  poolBalance  中提现 ERC20 代币  poolWithdraw
  it("Should withdraw ERC20 tokens from the pool with correct signatures", async function () {
    const withdrawAmount = ethers.utils.parseUnits("30", 6); // 10 TokenA with 6 decimals
    const expireTime = Math.floor(Date.now() / 1000) + 60 * 60; // 1小时后过期
    const orderId = Math.floor(Math.random() * 1000000000); // 生成一个随机的 orderId

    // 打印用户的 TokenA 提现后的余额
    const addr1BalanceBefore = await tokenA.balanceOf(addr1.address);
    console.log("TokenA Balance of addr1 Before withdrawal:", addr1BalanceBefore.toString());

    // 验证合约在提现前的余额
    const contractBalanceBefore = await tokenA.balanceOf(l1Pool.address);
    console.log("Contract TokenA balance before withdrawal:", contractBalanceBefore.toString());

    // 打印 poolBalances[tokenA] 的余额
    const poolBalanceBefore = await l1Pool.getPoolBalance(tokenA.address);
    console.log("Pool balance of TokenA before withdrawal:", ethers.utils.formatUnits(poolBalanceBefore, 6));

    // 创建签名消息（operationHash）
    const message = ethers.utils.solidityKeccak256(
      ["string", "address", "uint256", "address", "uint256", "uint256", "address"],
      ["POOL", addr1.address, withdrawAmount, tokenA.address, expireTime, orderId, l1Pool.address]
    );
    const messageHash = ethers.utils.arrayify(message);

    // 获取签名
    const sig1 = await addr1.signMessage(messageHash);
    const sig2 = await deployer.signMessage(messageHash);

    console.log("Signatures collected");

    try {
      // 调用 poolWithdraw 方法
      const tx = await l1Pool.connect(addr1).poolWithdraw(
        addr1.address,          // 提现地址
        withdrawAmount,         // 提现数量
        tokenA.address,         // 提现代币
        expireTime,             // 过期时间
        orderId,                // 订单ID
        [addr1.address, deployer.address], // 签名者地址
        [sig1, sig2],           // 签名
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      );

      console.log("Success! Transaction hash:", tx.hash);
    } catch (error) {
      console.log("Transaction failed:", error);
    }

    // 打印用户的 TokenA 提现后的余额
    const addr1BalanceAfter = await tokenA.balanceOf(addr1.address);
    console.log("TokenA Balance of addr1 after withdrawal:", addr1BalanceAfter.toString());

    // 验证合约在提现后的余额
    const contractBalanceAfter = await tokenA.balanceOf(l1Pool.address);
    console.log("Contract TokenA balance after withdrawal:", contractBalanceAfter.toString());

    // 打印 poolBalances[tokenA] 的余额
    const poolBalanceAfter = await l1Pool.getPoolBalance(tokenA.address);
    console.log("Pool balance of TokenA after withdrawal:", ethers.utils.formatUnits(poolBalanceAfter, 6));

  });

  // 测试从池  poolBalance  中提现 ETH  poolWithdraw
  it("Should withdraw ETH from the pool with correct signatures", async function () {
    const withdrawAmount = ethers.utils.parseUnits("3",6); // 1 ETH
    const expireTime = Math.floor(Date.now() / 1000) + 60 * 60; // 1小时后过期
    const orderId = Math.floor(Math.random() * 1000000000); // 生成一个随机的 orderId

    // 打印用户的 ETH 提现前的余额
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    console.log("ETH Balance of addr1 before withdrawal:", ethers.utils.formatEther(addr1BalanceBefore));

    // 验证合约在提现前的 ETH 余额
    const contractBalanceBefore = await ethers.provider.getBalance(l1Pool.address);
    console.log("Contract ETH balance before withdrawal:", ethers.utils.formatEther(contractBalanceBefore));

    // 打印 poolBalances[ETH] 的余额
    const poolBalanceBefore = await l1Pool.getPoolBalance(ethers.constants.AddressZero);
    console.log("Pool balance of ETH before withdrawal:", ethers.utils.formatEther(poolBalanceBefore));

    // 创建签名消息（operationHash）
    const message = ethers.utils.solidityKeccak256(
      ["string", "address", "uint256", "address", "uint256", "uint256", "address"],
      ["POOL", addr1.address, withdrawAmount, ethers.constants.AddressZero, expireTime, orderId, l1Pool.address]
    );
    const messageHash = ethers.utils.arrayify(message);

    // 获取签名
    const sig1 = await addr1.signMessage(messageHash);
    const sig2 = await deployer.signMessage(messageHash);

    console.log("Signatures collected");

    try {
      // 调用 poolWithdraw 方法
      const tx = await l1Pool.connect(addr1).poolWithdraw(
        addr1.address,          // 提现地址
        withdrawAmount,         // 提现数量
        ethers.constants.AddressZero, // 提现ETH
        expireTime,             // 过期时间
        orderId,                // 订单ID
        [addr1.address, deployer.address], // 签名者地址
        [sig1, sig2],           // 签名
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      );

      console.log("Success! Transaction hash:", tx.hash);
    } catch (error) {
      console.log("Transaction failed:", error);
    }

    // 打印用户的 ETH 提现后的余额
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    console.log("ETH Balance of addr1 after withdrawal:", ethers.utils.formatEther(addr1BalanceAfter));

    // 验证合约在提现后的 ETH 余额
    const contractBalanceAfter = await ethers.provider.getBalance(l1Pool.address);
    console.log("Contract ETH balance after withdrawal:", ethers.utils.formatEther(contractBalanceAfter));

    // 打印 poolBalances[ETH] 的余额
    const poolBalanceAfter = await l1Pool.getPoolBalance(ethers.constants.AddressZero);
    console.log("Pool balance of ETH after withdrawal:", ethers.utils.formatEther(poolBalanceAfter));
  });

  // 测试从 feeBalances 中提现 ERC20 代币  poolFeeWithdraw
  it("Should withdraw ERC20 tokens from feeBalances with correct signatures", async function () {
    const withdrawAmount = ethers.utils.parseUnits("30", 6); // 50 TokenA
    const expireTime = Math.floor(Date.now() / 1000) + 60 * 60; // 1小时后过期
    const orderId = Math.floor(Math.random() * 1000000000); // 生成一个随机的 orderId

    // 打印用户的 TokenA 提现前的余额
    const addr1BalanceBefore = await tokenA.balanceOf(addr1.address);
    console.log("TokenA Balance of addr1 before fee withdrawal:", ethers.utils.formatUnits(addr1BalanceBefore, 6));

    // 验证合约在提现前的 TokenA 余额
    const contractBalanceBefore = await tokenA.balanceOf(l1Pool.address);
    console.log("Contract TokenA balance before fee withdrawal:", ethers.utils.formatUnits(contractBalanceBefore, 6));

    // 打印 feeBalances[TokenA] 的余额
    const feeBalanceBefore = await l1Pool.getFeeBalance(tokenA.address);
    console.log("Fee balance of TokenA before withdrawal:", ethers.utils.formatUnits(feeBalanceBefore, 6));

    // 创建签名消息（operationHash）
    const message = ethers.utils.solidityKeccak256(
      ["string", "address", "uint256", "address", "uint256", "uint256", "address"],
      ["FEE", addr1.address, withdrawAmount, tokenA.address, expireTime, orderId, l1Pool.address]
    );
    const messageHash = ethers.utils.arrayify(message);

    // 获取签名
    const sig1 = await addr1.signMessage(messageHash);
    const sig2 = await deployer.signMessage(messageHash);

    console.log("Signatures collected");

    try {
      // 调用 poolFeeWithdraw 方法
      const tx = await l1Pool.connect(addr1).poolFeeWithdraw(
        addr1.address,          // 提现地址
        withdrawAmount,         // 提现数量
        tokenA.address,         // 提现代币
        expireTime,             // 过期时间
        orderId,                // 订单ID
        [addr1.address, deployer.address], // 签名者地址
        [sig1, sig2],           // 签名
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      );

      console.log("Success! Transaction hash:", tx.hash);
    } catch (error) {
      console.log("Transaction failed:", error);
    }

    // 打印用户的 TokenA 提现后的余额
    const addr1BalanceAfter = await tokenA.balanceOf(addr1.address);
    console.log("TokenA Balance of addr1 after fee withdrawal:", ethers.utils.formatUnits(addr1BalanceAfter, 6));

    // 验证合约在提现后的 TokenA 余额
    const contractBalanceAfter = await tokenA.balanceOf(l1Pool.address);
    console.log("Contract TokenA balance after fee withdrawal:", ethers.utils.formatUnits(contractBalanceAfter, 6));

    // 打印 feeBalances[TokenA] 的余额
    const feeBalanceAfter = await l1Pool.getFeeBalance(tokenA.address);
    console.log("Fee balance of TokenA after withdrawal:", ethers.utils.formatUnits(feeBalanceAfter, 6));

  });

  // 测试从 feeBalances 中提现 ETH  poolFeeWithdraw
  it("Should withdraw ETH from feeBalances with correct signatures", async function () {
    const withdrawAmount = ethers.utils.parseUnits("3",6); // 1 ETH
    const expireTime = Math.floor(Date.now() / 1000) + 60 * 60; // 1小时后过期
    const orderId = Math.floor(Math.random() * 1000000000); // 生成一个随机的 orderId

    // 打印用户的 ETH 提现前的余额
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    console.log("ETH Balance of addr1 before fee withdrawal:", ethers.utils.formatEther(addr1BalanceBefore));

    // 验证合约在提现前的 ETH 余额
    const contractBalanceBefore = await ethers.provider.getBalance(l1Pool.address);
    console.log("Contract ETH balance before fee withdrawal:", ethers.utils.formatEther(contractBalanceBefore));

    // 打印 feeBalances[ETH] 的余额
    const feeBalanceBefore = await l1Pool.getFeeBalance(ethers.constants.AddressZero);
    console.log("Fee balance of ETH before withdrawal:", ethers.utils.formatEther(feeBalanceBefore));

    // 创建签名消息（operationHash）
    const message = ethers.utils.solidityKeccak256(
      ["string", "address", "uint256", "address", "uint256", "uint256", "address"],
      ["FEE", addr1.address, withdrawAmount, ethers.constants.AddressZero, expireTime, orderId, l1Pool.address]
    );
    const messageHash = ethers.utils.arrayify(message);

    // 获取签名
    const sig1 = await addr1.signMessage(messageHash);
    const sig2 = await deployer.signMessage(messageHash);

    console.log("Signatures collected");

    try {
      // 调用 poolFeeWithdraw 方法
      const tx = await l1Pool.connect(addr1).poolFeeWithdraw(
        addr1.address,          // 提现地址
        withdrawAmount,         // 提现数量
        ethers.constants.AddressZero, // 提现 ETH
        expireTime,             // 过期时间
        orderId,                // 订单ID
        [addr1.address, deployer.address], // 签名者地址
        [sig1, sig2],           // 签名
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      );

      console.log("Success! Transaction hash:", tx.hash);
    } catch (error) {
      console.log("Transaction failed:", error);
    }

    // 打印用户的 ETH 提现后的余额
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    console.log("ETH Balance of addr1 after fee withdrawal:", ethers.utils.formatEther(addr1BalanceAfter));

    // 验证合约在提现后的 ETH 余额
    const contractBalanceAfter = await ethers.provider.getBalance(l1Pool.address);
    console.log("Contract ETH balance after fee withdrawal:", ethers.utils.formatEther(contractBalanceAfter));

    // 打印 feeBalances[ETH] 的余额
    const feeBalanceAfter = await l1Pool.getFeeBalance(ethers.constants.AddressZero);
    console.log("Fee balance of ETH after withdrawal:", ethers.utils.formatEther(feeBalanceAfter));

  });

  // 测试 批量设置用户余额的方法 setUserBalances
  it("Should set user balances correctly in bulk", async function () {
    // 准备测试数据
    const users = [addr1.address, addr2.address];
    const tokens = [tokenA.address, tokenB.address];
    const newBalances = [
        ethers.utils.parseUnits("11000", 6), // 100 TokenA
        ethers.utils.parseUnits("21000", 6)  // 200 TokenB
    ];

    // 获取设置之前的余额
    const balance1Before = await l1Pool.getUserBalance(addr1.address, tokenA.address);
    const balance2Before = await l1Pool.getUserBalance(addr2.address, tokenB.address);
    
    console.log("==== Balances Before Setting ====");
    console.log("Balance of addr1 for tokenA (before):", ethers.utils.formatUnits(balance1Before, 6));
    console.log("Balance of addr2 for tokenB (before):", ethers.utils.formatUnits(balance2Before, 6));
    
    // 让白名单账户调用 setUserBalances
    await l1Pool.connect(addr1).setUserBalances(
      users, 
      tokens, 
      newBalances,
      {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      }
    );

    // 检查余额是否正确设置
    const balance1 = await l1Pool.getUserBalance(addr1.address, tokenA.address);
    const balance2 = await l1Pool.getUserBalance(addr2.address, tokenB.address);

    console.log("Balance of addr1 for tokenA:", ethers.utils.formatUnits(balance1, 6));
    console.log("Balance of addr2 for tokenB:", ethers.utils.formatUnits(balance2, 6));
  });

  // 测试批量设置池余额的方法 setPoolBalances
  it("Should set pool balances correctly in bulk", async function () {
    // 准备测试数据
    const tokens = [tokenA.address, tokenB.address];
    const newBalances = [
      ethers.utils.parseUnits("100", 18), // 100 TokenA
      ethers.utils.parseUnits("200", 18)  // 200 TokenB
    ];

    // 获取设置之前的池余额
    const poolBalanceA_Before = await l1Pool.getPoolBalance(tokenA.address);
    const poolBalanceB_Before = await l1Pool.getPoolBalance(tokenB.address);
    
    console.log("==== Pool Balances Before Setting ====");
    console.log("Pool balance of tokenA (before):", ethers.utils.formatUnits(poolBalanceA_Before, 18));
    console.log("Pool balance of tokenB (before):", ethers.utils.formatUnits(poolBalanceB_Before, 18));
    
    // 让白名单账户调用 setPoolBalances
    await l1Pool.connect(owner).setPoolBalances(
      tokens, 
      newBalances,
      {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      }
    );

    // 检查池余额是否正确设置
    const poolBalanceA = await l1Pool.getPoolBalance(tokenA.address);
    const poolBalanceB = await l1Pool.getPoolBalance(tokenB.address);

    console.log("Pool balance of tokenA:", ethers.utils.formatUnits(poolBalanceA, 18));
    console.log("Pool balance of tokenB:", ethers.utils.formatUnits(poolBalanceB, 18));

    // 验证设置的值是否正确
    expect(poolBalanceA).to.equal(newBalances[0]);
    expect(poolBalanceB).to.equal(newBalances[1]);
  });






  it("Should perform emergency withdrawal of ETH", async function () {
    const withdrawAmount = ethers.utils.parseEther("0.05"); // 0.1 ETH
    const orderId = Math.floor(Math.random() * 1000000000); // 随机生成 orderId
    const expireTime = Math.floor(Date.now() / 1000) + 300; // 设置过期时间为当前时间加5分钟

    // 获取当前链的 Chain ID
    const network = await ethers.provider.getNetwork(); // 获取网络信息
    const chainId = network.chainId;  // 提取 chainId
    console.log("Current Chain ID:", chainId);

    // 打印用户的 ETH 提现前的余额
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    console.log("ETH Balance of addr1 before withdrawal:", ethers.utils.formatEther(addr1BalanceBefore));

    // 验证合约在提现前的 ETH 余额
    const contractBalanceBefore = await ethers.provider.getBalance(l1Pool.address);
    console.log("Contract ETH balance before withdrawal:", ethers.utils.formatEther(contractBalanceBefore));

    // 打印 poolBalances[ETH] 的余额
    const poolBalanceBefore = await l1Pool.getPoolBalance(ethers.constants.AddressZero);
    console.log("Pool balance of ETH before withdrawal:", ethers.utils.formatEther(poolBalanceBefore));

    // 创建签名消息（operationHash）
    const operationHash = ethers.utils.solidityKeccak256(
      ["string", "address", "uint256", "uint256", "uint256", "address", "uint256"],
      ["ETHER", addr1.address, withdrawAmount, expireTime, orderId, l1Pool.address, chainId]
    );
    const messageHash = ethers.utils.arrayify(operationHash);

    // 获取签名
    const signature1 = await addr1.signMessage(messageHash);
    const signature2 = await deployer.signMessage(messageHash);

    const allSigners = [addr1.address, deployer.address];
    const signatures = [signature1, signature2];

    console.log("Signatures collected");

    try {
      // 执行紧急提现ETH
      const tx = await l1Pool.connect(deployer).emergencyWithdrawETH(
        addr1.address,      // 提现到的地址
        withdrawAmount,     // 提现金额
        expireTime,         // 过期时间
        orderId,            // 唯一订单 ID
        allSigners,         // 签名者列表
        signatures,         // 签名列表
        {
          gasPrice: gasPrice,
          gasLimit: gasLimit
        }         
      );

      console.log("Success! Transaction hash:", tx.hash);
    } catch (error) {
      console.log("Transaction failed:", error);
    }

    // 打印用户的 ETH 提现后的余额
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    console.log("ETH Balance of addr1 after withdrawal:", ethers.utils.formatEther(addr1BalanceAfter));

    // 验证合约在提现后的 ETH 余额
    const contractBalanceAfter = await ethers.provider.getBalance(l1Pool.address);
    console.log("Contract ETH balance after withdrawal:", ethers.utils.formatEther(contractBalanceAfter));

    // 打印 poolBalances[ETH] 的余额
    const poolBalanceAfter = await l1Pool.getPoolBalance(ethers.constants.AddressZero);
    console.log("Pool balance of ETH after withdrawal:", ethers.utils.formatEther(poolBalanceAfter));
  });

  it("Should perform emergency withdrawal of ERC20 tokens", async function () {
    const withdrawAmount = ethers.utils.parseUnits("1", 6); // 100 TokenA (6位精度)
    const orderId = Math.floor(Math.random() * 1000000000); // 随机生成 orderId
    const expireTime = Math.floor(Date.now() / 1000) + 300; // 设置过期时间为当前时间加5分钟

    // 获取当前链的 Chain ID
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    console.log("Current Chain ID:", chainId);

    // 打印用户的 TokenA 提现前的余额
    const addr1BalanceBefore = await tokenA.balanceOf(addr1.address);
    console.log(`TokenA Balance of addr1 before withdrawal: ${ethers.utils.formatUnits(addr1BalanceBefore, 6)}`);

    // 验证合约在提现前的 TokenA 余额
    const contractBalanceBefore = await tokenA.balanceOf(l1Pool.address);
    console.log(`Contract TokenA balance before withdrawal: ${ethers.utils.formatUnits(contractBalanceBefore, 6)}`);

    // 打印 poolBalances[TokenA] 的余额
    const poolBalanceBefore = await l1Pool.getPoolBalance(tokenA.address);
    console.log(`Pool balance of TokenA before withdrawal: ${ethers.utils.formatUnits(poolBalanceBefore, 6)}`);

    // 创建签名消息（operationHash），包括 chainId
    const operationHash = ethers.utils.solidityKeccak256(
      ["string", "address", "uint256", "address", "uint256", "uint256", "address", "uint256"],
      ["ERC20", addr1.address, withdrawAmount, tokenA.address, expireTime, orderId, l1Pool.address, chainId]
    );
    const messageHash = ethers.utils.arrayify(operationHash);

    // 获取签名
    const signature1 = await addr1.signMessage(messageHash);
    const signature2 = await deployer.signMessage(messageHash);

    const allSigners = [addr1.address, deployer.address];
    const signatures = [signature1, signature2];

    console.log("Signatures collected");

    try {
      // 获取当前 gas price 和设置 gas limit
      const gasPrice = await ethers.provider.getGasPrice();
      const gasLimit = 500000; // 设置足够的 gas limit

      // 执行紧急提现ERC20 TokenA
      const tx = await l1Pool.connect(deployer).emergencyWithdrawErc20(
        addr1.address,      // 提现到的地址
        withdrawAmount,     // 提现金额
        tokenA.address,     // 提现的代币地址
        expireTime,         // 过期时间
        orderId,            // 唯一订单 ID
        allSigners,         // 签名者列表
        signatures,         // 签名列表
        {
          gasPrice: gasPrice,
          gasLimit: gasLimit
        }
      );

      console.log("Success! Transaction hash:", tx.hash);
    } catch (error) {
      console.log("Transaction failed:", error);
    }

    // 打印用户的 TokenA 提现后的余额
    const addr1BalanceAfter = await tokenA.balanceOf(addr1.address);
    console.log(`TokenA Balance of addr1 after withdrawal: ${ethers.utils.formatUnits(addr1BalanceAfter, 6)}`);

    // 验证合约在提现后的 TokenA 余额
    const contractBalanceAfter = await tokenA.balanceOf(l1Pool.address);
    console.log(`Contract TokenA balance after withdrawal: ${ethers.utils.formatUnits(contractBalanceAfter, 6)}`);

    // 打印 poolBalances[TokenA] 的余额
    const poolBalanceAfter = await l1Pool.getPoolBalance(tokenA.address);
    console.log(`Pool balance of TokenA after withdrawal: ${ethers.utils.formatUnits(poolBalanceAfter, 6)}`);
  });





  // 注入原生代币（ETH）到 1inch 合约
  it("Should inject native token (ETH) to mockRouterAddress", async function () {
    // 定义要发送的 ETH 数量，假设我们发送 1 ETH
    const ethAmount = ethers.utils.parseEther("1");

    // 打印要发送的 ETH 数量
    console.log("Sending ETH to mockRouterAddress:", ethers.utils.formatEther(ethAmount), "ETH");

    // 获取测试中的 deployer（或其他账户）来发送 ETH
    const [deployer] = await ethers.getSigners();

    // 查看 deployer 的原生代币余额
    const deployerBalance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer's balance before transaction:", ethers.utils.formatEther(deployerBalance), "ETH");

    // 通过 signer 向 mockRouterAddress 发送 ETH
    const tx = await deployer.sendTransaction({
        to: mockRouter.address,  // 目标地址（mockRouterAddress）
        value: ethAmount,        // 发送的 ETH 数量
        gasLimit,
        gasPrice
    });

    // 等待交易完成
    await tx.wait();

    // 打印交易哈希
    console.log("Transaction hash:", tx.hash);

    // 查看 mockRouterAddress 的余额
    const balance = await ethers.provider.getBalance(mockRouter.address);
    console.log("mockRouterAddress balance after injection:", ethers.utils.formatEther(balance), "ETH");

    // 查看 deployer 的原生代币余额
    const deployerBalanceAfter = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer's balance after transaction:", ethers.utils.formatEther(deployerBalanceAfter), "ETH");
  });

  // 打印 L1Pool 合约里余额
  it.only("Print L1Pool Contract Balance", async function () {
    const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    await printBalances(l1Pool, addr1, tokens);
  });
  
  // 打印 L1Pool 合约里余额的函数
  async function printBalances(l1Pool, user, tokens) {
    console.log("-------------------开始打印余额----------------------");
    
    // 遍历每个传入的代币地址（包括 ethers.constants.AddressZero 表示 ETH）
    for (let token of tokens) {
      let tokenName = token === ethers.constants.AddressZero ? "ETH" : token;
  
      // 获取用户的 userBalances
      const userBalance = await l1Pool.getUserBalance(user.address, token);
      console.log(`User ${user.address} owns ${tokenName} token (userBalances):`, ethers.utils.formatUnits(userBalance, 18));

      // 获取 poolBalances
      const poolBalance = await l1Pool.getPoolBalance(token);
      console.log(`${tokenName} token (poolBalances):`, ethers.utils.formatUnits(poolBalance, 18));
  
      // 获取 feeBalances
      const feeBalance = await l1Pool.getFeeBalance(token);
      console.log(`${tokenName} token (feeBalances):`, ethers.utils.formatUnits(feeBalance, 18));
  
      // 获取真实的合约代币余额和原生代币（ETH）余额
      if (token === ethers.constants.AddressZero) {
        // 原生代币 ETH 余额
        const realBalance = await ethers.provider.getBalance(l1Pool.address);
        console.log(`L1Pool contract real ${tokenName} balance (contract):`, ethers.utils.formatEther(realBalance));
      } else {
        // ERC20 代币余额
        const tokenContract = await ethers.getContractAt("IERC20", token);
        const realTokenBalance = await tokenContract.balanceOf(l1Pool.address);
        console.log(`L1Pool contract real ${tokenName} balance (contract):`, ethers.utils.formatUnits(realTokenBalance, 18));
      }
      console.log("---------------------------------------")
      
    }
    console.log("-----------------结束打印余额----------------------");
  }
  
  // 打印 1inch合约里的余额
  it("Print mockRouter Contract Balance", async function () {
    const tokens = [ethers.constants.AddressZero, tokenA.address, tokenB.address];
    const mockRouterAddress = mockRouter.address; // 假设 mockRouter 是你在其他地方定义的合约实例
    await printMockRouterBalances(mockRouterAddress, tokens);
  });
  // 打印 1inch合约里的余额的函数
  async function printMockRouterBalances(mockRouterAddress, tokens) {
    console.log(`-------------------开始打印 mockRouter (${mockRouterAddress}) 余额----------------------`);
    
    // 遍历每个传入的代币地址（包括 ethers.constants.AddressZero 表示 ETH）
    for (let token of tokens) {
      let tokenName = token === ethers.constants.AddressZero ? "ETH" : token;
  
      // 获取真实的合约代币余额和原生代币（ETH）余额
      if (token === ethers.constants.AddressZero) {
        // 原生代币 ETH 余额
        const realEthBalance = await ethers.provider.getBalance(mockRouterAddress);
        console.log(`mockRouter contract real ${tokenName} balance (contract):`, ethers.utils.formatEther(realEthBalance));
      } else {
        // ERC20 代币余额
        const tokenContract = await ethers.getContractAt("IERC20", token);
        const realTokenBalance = await tokenContract.balanceOf(mockRouterAddress);
        console.log(`mockRouter contract real ${tokenName} balance (contract):`, ethers.utils.formatUnits(realTokenBalance, 18));
      }
      console.log("---------------------------------------");
    }
  
    console.log(`-----------------结束打印 mockRouter (${mockRouterAddress}) 余额----------------------`);
  }




  // 测试 updateSigners 方法  updateSigners
  it("Should update signers correctly", async function () {
    console.log("Update signers test start");

    // 新的signers地址列表
    // const newSigners = [addr1.address, addr2.address, deployer.address];

    // arbTestnet 签名
    // const newSigners = [
    //   "0x76655505bACBBd9290c501328A18466E51f94eF9", 
    //   "0x877F6516C06Dd704eafF6ddD97B1FCD85Beb4De6", 
    //   "0x12348A92336066Ac2A1542a7C6fEe981e4da2D5E"
    // ];

    // baseMainnet 和 eth 签名
    const newSigners = [
      "0xd6cc63f4031C6521a05857E61d48Be87C4A1EaC2", 
      "0xe0e69F5Dcc824e363e24125b3dd5f45d95814Adf", 
      "0x22c89137525b593Dd2A18434348b550ffA5984Fe"
    ];

    // 预估 gas 费用
    const estimatedGas = await l1Pool.estimateGas.updateSigners(newSigners);
    console.log(`Estimated gas for updateSigners: ${estimatedGas.toString()}`);

    // 计算预估费用
    const estimatedCost = estimatedGas.mul(gasPrice);
    console.log(`Estimated transaction cost: ${ethers.utils.formatEther(estimatedCost)} ETH`);

    // 调用updateSigners方法更新signers
    const tx = await l1Pool.connect(deployer).updateSigners(
      newSigners,
      {
        gasLimit:gasLimit,
        gasPrice:gasPrice
      }
    );

    console.log("updateSigners tx hash:",tx.hash)

    console.log("Update signers test end");
  });

  // 添加白名单  addToWhitelist
  it("Should check if addr1 is in the whitelist", async function () {
    // const customAddress = "0x12348A92336066Ac2A1542a7C6fEe981e4da2D5E";  // arbTestnet 白名单
    const customAddress = "0xda2F2e9D5c42251178Ff885b2C69177073384157";  // baseMainnet 和 eth 白名单

    // 查询 customAddress 是否在白名单中（应该是 false）
    const isWhitelistedBefore = await l1Pool.whitelist(customAddress);
    console.log("Is addr1 whitelisted before:", isWhitelistedBefore);

    // 添加 customAddress 到白名单并打印交易哈希
    const tx = await l1Pool.addToWhitelist(customAddress);
    console.log("Transaction hash for adding to whitelist:", tx.hash);

    // 查询 customAddress 是否在白名单中（应该是 true）
    const isWhitelistedAfter = await l1Pool.whitelist(customAddress);
    console.log("Is addr1 whitelisted after:", isWhitelistedAfter);
  });

  // 移除白名单  removeFromWhitelist
  it("Should remove addr1 from the whitelist", async function () {
    // 查询 addr1 是否在白名单中（应该是 true）
    const isWhitelistedBefore = await l1Pool.whitelist(addr1.address);
    console.log("Is addr1 whitelisted before:", isWhitelistedBefore);

    // 只有 deployer（合约所有者）可以移除白名单
    await l1Pool.removeFromWhitelist(
      addr1.address,
      {
        gasPrice: gasPrice,
        gasLimit: gasLimit
      }
    );

    // 查询 addr1 是否从白名单中移除（应该是 false）
    const isWhitelistedAfter = await l1Pool.whitelist(addr1.address);
    console.log("Is addr1 whitelisted after:", isWhitelistedAfter);
  });

  // 测试设置代币为多链资产的方法 setMultiChainAsset
  it("Should set a token as multi-chain correctly", async function () {
    const customTokenAddress = "0x8ED32Fc5c3C18330997670d7Be1702126c40aBed";

    // 查询 customTokenAddress 是否为多链资产（应该是 false）
    const isMultiChainBefore = await l1Pool.multiChainAssets(customTokenAddress);
    console.log("Is customTokenAddress a multi-chain asset before:", isMultiChainBefore);

    // 调用 setMultiChainAsset 设置 customTokenAddress 为多链资产并打印交易哈希
    const tx = await l1Pool.setMultiChainAsset(customTokenAddress, true);
    console.log("Transaction hash for setting multi-chain asset:", tx.hash);

    // 查询 customTokenAddress 是否为多链资产（应该是 true）
    const isMultiChainAfter = await l1Pool.multiChainAssets(customTokenAddress);
    console.log("Is customTokenAddress a multi-chain asset after:", isMultiChainAfter);

    // 验证 customTokenAddress 是否成功设置为多链资产
    expect(isMultiChainAfter).to.equal(true);

    // 验证事件是否正确发出
    await expect(tx)
      .to.emit(l1Pool, "MultiChainAssetUpdated")
      .withArgs(customTokenAddress, true);
  });
  

});
