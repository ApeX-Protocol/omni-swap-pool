const { ethers } = require("ethers");

async function getTransactionDetails(txHash) {
    // const provider = new ethers.providers.JsonRpcProvider(`https://arbitrum-sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
    const provider = new ethers.providers.JsonRpcProvider(`http://127.0.0.1:8545`);
    
    try {
        // 获取交易详细信息
        const transaction = await provider.getTransaction(txHash);
        console.log(transaction);
        
        // 获取交易收据
        const receipt = await provider.getTransactionReceipt(txHash);
        console.log(receipt);

        if (receipt.status === 1) {
            console.log("===================Transaction was successful===================");
        } else {
            console.log("===================Transaction failed===================");
        }
    } catch (error) {
        console.error("Error fetching transaction details:", error);
    }
}

// getTransactionDetails("0x50bf436b1ea15136db41293ce283e99dcebd4c1938d7c99dfb317df098ec086b");
getTransactionDetails("0xcbcc71d2be18b1c4a0b6dacfc52848312a98da532f1b9a4420d3018d24ade352");


// const { ethers } = require("ethers");

// async function getERC20Transfers(txHash) {
//     const provider = ethers.getDefaultProvider(); 
//     const receipt = await provider.getTransactionReceipt(txHash);

//     // ERC-20 Transfer事件的topic
//     const transferTopic = ethers.utils.id("Transfer(address,address,uint256)");

//     receipt.logs.forEach(log => {
//         if (log.topics[0] === transferTopic) {
//             const from = ethers.utils.getAddress(log.topics[1].replace('0x000000000000000000000000', '0x'));
//             const to = ethers.utils.getAddress(log.topics[2].replace('0x000000000000000000000000', '0x'));
//             const value = ethers.BigNumber.from(log.data).toString();

//             console.log(`From: ${from} To: ${to} Value: ${ethers.utils.formatUnits(value, 18)}`);
//         }
//     });
// }

// getERC20Transfers("0xbf6996157748c4c5caf10b4cb49befe385e5ac21d2dd35596a3959dc04f81628");
