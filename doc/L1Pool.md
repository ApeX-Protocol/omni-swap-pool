# L1Pool 操作文档

## 概述
本操作文档旨在指导用户编译、部署、测试和验证 L1Pool 合约。

## 1. 编译合约
首先，编译合约以生成合约的字节码和 ABI。
```bash
npx hardhat compile
```

## 2. 部署合约
### 2.1 部署 L1Pool 合约
使用以下命令部署 L1Pool 合约。
```bash
npx hardhat run scripts/deployL1Pool.js --network arbTestnet
```

### 2.2 部署 1inch 合约
接着，部署模拟的 1inch 合约以进行代币兑换。
```bash
npx hardhat run scripts/deploy1inch.js --network arbTestnet
```

## 3. 测试合约
使用以下命令执行 L1Pool 合约的测试脚本。
```bash
npx hardhat test test/l1pool_test.js --network arbTestnet
```

## 4. 验证合约
使用以下命令验证 L1Pool 合约。
```bash
npx hardhat run scripts/verifyL1Pool.js --network arbTestnet
```

## 注意事项
### gasLimit 和 gasPrice 参考值：
- **gasPrice**：
  - sepolia: 9 gwei 
  - bsc: 5 gwei
  - arb: 0.1 gwei
  - mantle: 0.02 gwei
  - base: 0.008 gwei

- **gasLimit**：
  - eth: 5 * 10^4
  - bsc: 10^10
  - arb: 10^8
  - mantle: 10^10
  - base: 5 * 10^6

1. 部署后需要修改 多签地址 和 白名单地址, 后端才能正常调用合约接口
2. 通过 setMultiChainAsset 接口，设置 usdt 等资金池资产为 多链资产