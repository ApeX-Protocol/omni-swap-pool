# 审计文档

## 1. 概述

**合约名称**: L1Pool  
**合约地址**: (待部署)  
**审计目标**: 确保合约的安全性、功能的正确性、逻辑的合理性，避免常见的安全漏洞，如重入攻击、权限管理问题等。  

**L1Pool合约核心功能**:  
L1Pool合约的核心功能是帮助用户进行跨链现货交易，并提供资金垫付以加速交易过程。用户可以通过L1Pool合约将其持有的资产在L1链上和L2链上实现快速兑换。合约支持跨链交易、手续费管理、用户和资金池的余额管理，以及紧急情况下的提现功能。

---

## 2. 合约设计目标

L1Pool 合约的设计目标是为用户提供快速现货交易服务，尤其是在 L2 和 L1 之间实现跨链资产兑换。通过该合约，用户可以实现以下功能：

1. **跨链资金的快速交易与资产划转**:
    - **`swapFromPool` 功能**：用户可以通过 `swapFromPool` 接口将 L2 链上的资产快速兑换为 L1 链上的资产。合约使用池中预先垫付的资金，帮助用户完成兑换，并将兑换后的目标资产存入用户的 `userBalances` 中。这种方式极大地加快了跨链交易的速度，使用户能够立即在 L1 上获得目标资产，而无需等待实际的跨链资金转移。

    - **`swapFromUser` 功能**：用户可以通过 `swapFromUser` 接口在 L1 链上进行代币兑换。此操作不涉及跨链逻辑，而是允许用户在 L1 上灵活兑换资产并将兑换后的代币存入 `userBalances`。这种功能适用于用户希望在 L1 链上完成资产的快速兑换。

    - **`omniTransferToSpot` 功能**：该接口允许用户将 L1 链上的资产划转到 zkLink 这一 L2 网络。通过此功能，用户可以将 L1Pool 合约中的 L1 资产通过 zkLink 网关转移到 L2 的 `spot` 账户，从而在 L2 网络上继续使用其资产。

2. **用户资产管理**:
   - 用户的资产存储在 `userBalances` 中，用户可以通过合约在不同的代币之间进行兑换，或通过提现功能将资产从 L1Pool 中提取到自己的钱包。合约提供多种接口，帮助用户灵活管理其 L1 和 L2 层的资产。

3. **手续费管理**:
   - 合约在用户交易过程中收取的手续费存储在 `feeBalances` 中。每次交易（如 `swapFromPool` 或 `swapFromUser`）都会扣除一定的手续费，并记录在该映射中。合约管理者可以通过专门的接口提取这些手续费。

4. **多链资产管理**:
   - `multiChainAssets` 映射用于记录哪些代币是多链资产，哪些是单链资产。多链资产存在于多个区块链网络中，因而需要特殊的处理逻辑。例如，当用户使用多链资产时，合约会根据资产类型决定是更新用户余额还是更新池子余额。

5. **白名单控制**:
   - 通过 `whitelist`，合约对敏感操作进行了严格的权限控制。只有经过授权的白名单账户才能调用涉及资金操作的接口，如 `swapFromPool`、`userWithdraw` 和 `setUserBalances` 等。该机制确保只有经过信任的账户才能操作合约中的资金，增强了合约的安全性。

### 主要变量解释：
1. **`poolBalances`**: 记录L1Pool合约中合约管理者垫付的资金池金额。
2. **`userBalances`**: 记录用户在L1Pool合约中通过 `swap` 交易存入的资产。
3. **`feeBalances`**: 记录每种代币的手续费余额。
4. **`multiChainAssets`**: 记录哪些代币属于多链资产，哪些是单链资产。多链资产需要特殊处理。
5. **`whitelist`**: 记录允许调用接口的白名单用户。

---

### 3. 核心接口解释

#### 3.1 `depositToPool` 接口功能
- **功能**: 合约管理者通过此接口将资金注入 `L1Pool` 合约，资金记录在 `poolBalances` 中，以便为用户后续的 `swap` 交易提供资金垫付。
- **输入**:
  - `address token`: 要存入的代币地址，如果是ETH，传入`address(0)`。
  - `uint256 amount`: 要存入的代币数量，对于ETH存款则忽略此参数，取`msg.value`。
- **逻辑**:
  1. 如果 `token` 是原生代币（如 ETH），则需要 `msg.value > 0` 并将ETH余额增加到 `poolBalances[address(0)]`。
  2. 如果 `token` 是 ERC20 代币，检查 `amount > 0` 并确保 `msg.value == 0`，通过 `safeTransferFrom` 将ERC20代币转入合约，并将其添加到 `poolBalances`。
- **输出**: 无直接返回值。触发 `DepositToPool` 事件，记录资金存入操作。
- **安全性考虑**: 
  - 合约严格区分ETH和ERC20存款，防止混淆。
  - 通过 `safeTransferFrom` 确保ERC20代币转账的安全性。

#### 3.2 `swapFromPool` 接口功能
- **功能**: 用户通过此接口将L2zklink中持有的代币兑换成L1上的目标代币，利用 `L1Pool` 合约的资金进行垫付，达到 L2 到 L1 的快速兑换。
- **输入**:
  - `address token`: 用户想要兑换的源代币地址（可为ETH或ERC20代币）。
  - `uint256 amount`: 用户想要兑换的代币数量。
  - `address routerAddress`: 执行交换操作的路由合约地址。
  - `bytes calldata exchangeData`: 包含代币交换细节的编码数据。
  - `address user`: 进行交换的用户地址。
  - `uint256 fee`: 本次交易收取的手续费，记入 `feeBalances`。
- **逻辑**:
  1. 验证 `whitelist`，确保调用者有权限。
  2. 检查 `poolBalances[token]` 是否有足够余额覆盖 `amount + fee`。
  3. 根据源代币和目标代币的类型（原生代币/ ERC20），分别处理：
     - 如果源代币是 ETH，调用 `routerAddress.call{value: amount}` 进行兑换。
     - 如果是 ERC20，则通过 `safeApprove` 授权后调用 `routerAddress` 进行兑换。
  4. 通过 `abi.decode` 解析交换结果，检查返回的目标代币数量，并将目标代币增加到 `userBalances[user]`。
  5. 记录交易的手续费到 `feeBalances`。
- **输出**: 返回 `returnAmount`，即兑换后用户获得的目标代币数量。触发 `SwapFromPool` 事件。
- **安全性考虑**:
  - 通过 `whitelist` 进行权限控制。
  - 确保 `poolBalances` 在兑换前有足够的余额。
  - 通过 `safeApprove` 进行安全的ERC20授权，防止代币被盗。

#### 3.3 `swapFromUser` 接口功能
- **功能**: 用户可以通过此接口在L1层进行代币兑换（纯L1层操作，不涉及跨链逻辑）。
- **输入**:
  - `address token`: 用户想要兑换的源代币地址（可为ETH或ERC20代币）。
  - `uint256 amount`: 用户想要兑换的代币数量。
  - `address routerAddress`: 执行交换操作的路由合约地址。
  - `bytes calldata exchangeData`: 包含代币交换细节的编码数据。
  - `address user`: 进行交换的用户地址。
  - `uint256 fee`: 本次交易收取的手续费，记入 `feeBalances`。
- **逻辑**:
  1. 验证 `whitelist`，确保调用者有权限。
  2. 检查用户 `userBalances[user][token]` 是否足够覆盖 `amount + fee`。
  3. 将用户的余额扣除 `amount + fee`。
  4. 根据 `exchangeData` 调用 `routerAddress` 进行兑换，并解析交换结果。
  5. 通过 `multiChainAssets` 判断目标代币是否为多链资产：
     - 如果是多链资产，则增加 `poolBalances`。
     - 如果是单链资产，则增加 `userBalances[user]`。
  6. 将手续费记录到 `feeBalances`。
- **输出**: 返回 `returnAmount`，即用户获得的目标代币数量（扣除手续费）。触发 `SwapFromUser` 事件。
- **安全性考虑**:
  - 通过 `whitelist` 进行权限控制。
  - 确保用户有足够的代币余额。
  - 通过 `safeApprove` 进行安全的ERC20授权，防止代币被盗。

#### 3.4 `omniTransferToSpot` 接口功能
- **功能**: 用户可以通过此接口将 `omni` 账户上的资产转移到 `spot` 账户（L1链到L2zklink的转移）。
- **输入**:
  - `address token`: 用户要划转的代币地址（可为ETH或ERC20代币）。
  - `uint256 amount`: 用户想要划转的代币数量。
  - `bytes32 zkLinkAddress`: 用户的 `zkLink` 地址。
  - `address user`: 进行划转操作的用户地址。
  - `uint256 fee`: 划转操作收取的手续费。
- **逻辑**:
  1. 验证 `whitelist`，确保调用者有权限。
  2. 检查用户 `userBalances[user][token]` 是否足够覆盖 `amount + fee`。
  3. 扣除用户的代币余额，并记录手续费到 `feeBalances`。
  4. 调用 `ZK_SYNC_L1_GATEWAY_ADDRESS` 进行 L1 到 L2 代币的转移：
     - 如果是 ETH，则调用 `depositETH`。
     - 如果是 ERC20 代币，则通过 `safeApprove` 后调用 `depositERC20`。
- **输出**: 无返回值。触发 `OmniTransferToSpot` 事件，记录划转操作。
- **安全性考虑**:


  - 通过 `whitelist` 进行权限控制。
  - 确保用户有足够的代币余额。
  - 通过 `safeApprove` 进行安全的ERC20授权。

#### 3.5 `userWithdraw` 接口功能
- **功能**: 用户可以通过此接口从L1Pool合约中提取其存入的代币。
- **输入**:
  - `address userAddress`: 用户的地址。
  - `address token`: 用户想要提取的代币地址（ETH或ERC20代币）。
  - `uint256 amount`: 提取的代币数量。
  - `uint256 fee`: 提取过程中需要扣除的手续费。
- **逻辑**:
  1. 验证 `whitelist`，确保调用者有权限。
  2. 检查用户 `userBalances[userAddress][token]` 是否足够覆盖 `amount + fee`。
  3. 扣除用户的代币余额，并记录手续费到 `feeBalances`。
  4. 如果是 ETH，使用 `call` 向用户地址发送 ETH。
  5. 如果是 ERC20，使用 `safeTransfer` 将代币发送给用户。
- **输出**: 无返回值。触发 `UserWithdraw` 事件，记录提现操作。
- **安全性考虑**:
  - 确保用户有足够的代币余额，防止超额提取。
  - 通过 `safeTransfer` 安全地转移ERC20代币，防止代币丢失。

#### 3.6 `poolWithdraw` 接口功能
- **功能**: 合约管理者通过此接口可以从 `L1Pool` 合约中提取垫付的资金。
- **输入**:
  - `address to`: 提款的目标地址。
  - `uint256 amount`: 提款的代币数量。
  - `address token`: 要提取的代币地址。
  - `uint256 expireTime`: 提款请求的过期时间。
  - `uint256 orderId`: 唯一的提款订单ID。
  - `address[] memory allSigners`: 参与多签的签名者地址列表。
  - `bytes[] memory signatures`: 签名列表，对应 `allSigners` 中的地址。
- **逻辑**:
  1. 检查签名者列表和签名是否有效，确保至少有两个不同的签名者签署提款请求。
  2. 确认订单ID未被执行过，防止重复提款。
  3. 检查 `poolBalances[token]` 中是否有足够余额覆盖提款金额。
  4. 如果是 ETH，使用 `call` 向目标地址发送 ETH。
  5. 如果是 ERC20，使用 `safeTransfer` 将代币发送给目标地址。
- **输出**: 无返回值。触发 `PoolWithdraw` 事件，记录提款操作。
- **安全性考虑**:
  - 确保提款操作通过多签验证，并检查订单ID避免重复提款。
  - 通过 `safeTransfer` 和 `call` 进行安全的资金转移。

#### 3.7 `poolFeeWithdraw` 接口功能
- **功能**: 合约管理者通过此接口提取L1Pool合约中累积的手续费。
- **输入**:
  - `address to`: 提取手续费的目标地址。
  - `uint256 amount`: 提取的手续费数量。
  - `address token`: 提取的代币地址。
  - `uint256 expireTime`: 提款请求的过期时间。
  - `uint256 orderId`: 唯一的提款订单ID。
  - `address[] memory allSigners`: 参与多签的签名者地址列表。
  - `bytes[] memory signatures`: 签名列表，对应 `allSigners` 中的地址。
- **逻辑**:
  1. 检查签名者列表和签名是否有效。
  2. 确认订单ID未被执行过。
  3. 检查 `feeBalances[token]` 中是否有足够的手续费余额。
  4. 将手续费余额转移到目标地址。
- **输出**: 无返回值。触发 `PoolFeeWithdraw` 事件。
- **安全性考虑**:
  - 与 `poolWithdraw` 类似，多签验证和订单ID检查确保提款操作的安全性。

#### 3.8 `emergencyWithdrawETH` 接口功能
- **功能**: 用户在紧急情况下，可以通过此接口提取存入合约中的 ETH。
- **输入**:
  - `address payable to`: 提款的目标地址。
  - `uint256 amount`: 提取的ETH数量。
  - `uint256 expireTime`: 提款请求的过期时间。
  - `uint256 orderId`: 唯一的提款订单ID。
  - `address[] memory allSigners`: 参与多签的签名者地址列表。
  - `bytes[] memory signatures`: 签名列表，对应 `allSigners` 中的地址。
- **逻辑**:
  1. 检查签名者列表和签名是否有效，确保至少两个不同的签名者签署提款请求。
  2. 确认订单ID未被执行过，防止重复提款。
  3. 检查合约中是否有足够的ETH余额。
  4. 使用 `call` 向目标地址发送ETH。
- **输出**: 无返回值。触发 `WithdrawETH` 事件。
- **安全性考虑**:
  - 多签验证确保紧急提款操作的安全性。
  - 检查订单ID防止重复提款。
  - 使用 `call` 安全地转移ETH，防止失败的ETH转账。

#### 3.9 `emergencyWithdrawERC20` 接口功能
- **功能**: 用户在紧急情况下，可以通过此接口提取存入合约中的ERC20代币。
- **输入**:
  - `address to`: 提款的目标地址。
  - `uint256 amount`: 提取的ERC20代币数量。
  - `address token`: 提取的ERC20代币地址。
  - `uint256 expireTime`: 提款请求的过期时间。
  - `uint256 orderId`: 唯一的提款订单ID。
  - `address[] memory allSigners`: 参与多签的签名者地址列表。
  - `bytes[] memory signatures`: 签名列表，对应 `allSigners` 中的地址。
- **逻辑**:
  1. 检查签名者列表和签名是否有效，确保至少两个不同的签名者签署提款请求。
  2. 确认订单ID未被执行过，防止重复提款。
  3. 检查 `poolBalances[token]` 中是否有足够ERC20余额。
  4. 使用 `safeTransfer` 将ERC20代币发送到目标地址。
- **输出**: 无返回值。触发 `WithdrawERC20` 事件。
- **安全性考虑**:
  - 多签验证确保紧急提款操作的安全性。
  - 检查订单ID防止重复提款。
  - 通过 `safeTransfer` 安全地转移ERC20代币，防止代币丢失。

---

## 4. 安全性考量

### 4.1 重入攻击防护
- 合约中使用了 `ReentrancyGuard` 来防止重入攻击，所有涉及外部调用的函数都带有 `nonReentrant` 修饰符。

### 4.2 多签机制验证
- 所有涉及多签的操作都依赖于 `ECDSA` 签名验证，确保只有经过授权的账户才能执行操作。
- 每次多签操作都会生成独特的哈希，通过验证签名者是否属于 `signers` 来完成多签验证。

### 4.3 权限管理
- `whitelist` 机制确保了只有白名单中的账户可以调用敏感操作，如批量修改余额、提现等。
- 只有合约的所有者才能修改白名单，确保权限操作的安全性。

### 4.4 资产安全
- 用户和合约管理者的资产都存储在不同的变量中（`userBalances` 和 `poolBalances`），且有清晰的区分。合约在每次提现或交换操作前都会检查余额，防止余额不足的操作。

---

## 5. 部署和运行环境配置

### 5.1 合约部署说明

部署 L1Pool 合约时需要考虑以下步骤：

1. **环境准备**:
   - 使用 Hardhat 进行合约的开发、编译和部署。
   - 在部署之前，确保网络配置正确，例如 RPC 节点的配置，确保您有 `.env` 文件来存储敏感信息（如私钥和 Infura API 密钥）。

2. **部署步骤**:
   1. **编译合约**: 部署脚本可以参考scripts/deployL1Pool.js文件，验证合约脚本可以参考verifyL1Pool.js文件。
   使用 `npm run compile` 或 `npx hardhat compile` 进行合约编译，确保没有语法或编译错误。
   2. **配置部署参数**:
      - 配置合约构造函数的参数，例如允许的签名者（`allowedSigners`）、初始白名单（`initialWhitelist`）、zkSync L1 网关地址（`zkSyncL1Gateway`）以及 USDT 地址（`usdtAddress`）。
   3. **执行部署**: 使用部署脚本（例如 `npm run deploy` 或 `npx hardhat run scripts/deploy.js --network goerli`）部署合约到特定的网络（例如 Goerli 测试网或主网）。

3. **部署后验证**:
   - 部署成功后，使用 Etherscan 或其他区块浏览器验证合约代码。可以通过运行 `npm run verify` 来自动化这一过程。
   - 通过调用合约中的基本方法（如 `depositToPool` 和 `swapFromPool`）测试合约的基本功能，确保其行为符合预期。

### 5.2 运行环境配置

为了成功编译、部署和运行 L1Pool 合约，以下是需要配置的开发环境：

1. **Node.js 版本**: `v16.x` 或更高版本，建议使用稳定版以确保兼容性。
2. **NPM 版本**: `v7.x` 或更高版本，或者使用 Yarn (`v1.22.x` 或更高版本)。
3. **Ethers.js 版本**: `v5.6.5`，用于与以太坊网络进行交互。
4. **Solidity 编译器版本**: 合约使用 Solidity `^0.8.0` 版本编写，确保 Hardhat 中的编译器版本与之匹配。
5. **其他依赖工具**: 
   - **Hardhat**: 作为 Solidity 开发环境，需安装 Hardhat (`npm install --save-dev hardhat`)。
   - **OpenZeppelin 库**: 合约中使用了 OpenZeppelin 的工具库 (`@openzeppelin/contracts`) 来实现代币标准、权限管理等功能。
   - **Hardhat 插件**:
     - `@nomiclabs/hardhat-ethers` 和 `@nomiclabs/hardhat-waffle` 用于合约的编译和测试。
     - `@nomiclabs/hardhat-etherscan` 用于合约部署后的验证。
     - `hardhat-deploy` 用于部署脚本的增强支持。
     - `hardhat-gas-reporter` 用于报告合约调用的 Gas 消耗。
     - `solidity-coverage` 用于生成合约的代码覆盖率报告。
   - **测试库**:
     - **Chai**: 用于编写合约测试断言（`chai` 库）。
     - **Ethereum Waffle**: 用于智能合约的测试框架（`ethereum-waffle` 库）。
   - **其他库**:
     - **MerkleTreeJS**: 用于创建和验证 Merkle 树。
     - **dotenv**: 用于加载 `.env` 文件中的环境变量。

### 5.3 安装依赖

```sh
# 安装 Node.js 环境
nvm install 16
nvm use 16

# 初始化项目并安装依赖
# 如果已经有 yarn.lock 文件，直接运行以下命令安装所有依赖
yarn install
```

### 5.4 配置 .env 文件

创建 `.env` 文件以存储私钥、RPC 节点 URL 等敏感信息。

```env
INFURA_API_KEY=your_infura_api_key
PRIVATE_KEY=your_private_key
NETWORK=mainnet # 或 goerli/polygon 等网络
```

### 5.5 部署合约脚本示例

```js
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const L1Pool = await hre.ethers.getContractFactory("L1Pool");
  const l1Pool = await L1Pool.deploy(
    ["0xSigner1", "0xSigner2", "0xSigner3"], // allowedSigners
    ["0xWhitelist1", "0xWhitelist2"], // initialWhitelist
    "0xZkSyncGatewayAddress", // zkSync L1 Gateway
    "0xUSDTAddress" // USDT token address
  );

  await l1Pool.deployed();
  console.log("L1Pool deployed to:", l1Pool.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```
---

## 6. 结论

L1Pool 合约设计用于为用户提供跨链交易和现货兑换服务，涉及的核心功能包括多签管理、白名单管理、跨链资产处理以及资金池管理。合约通过多签机制和白名单保护关键操作，确保操作安全性。为了保证系统的稳健性，合约引入了多重防护措施，如重入防护、代币授权控制等。建议审计团队仔细检查以下方面：
- 重入攻击防护
- 多签机制的签名验证
- 资产管理的安全性
- 多链资产的正确处理逻辑

请审计团队根据合约功能和设计，深入分析其潜在风险和漏洞，确保合约的安全性和可靠性。

---
