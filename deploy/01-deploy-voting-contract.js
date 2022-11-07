const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
require("dotenv").config();

const { verify } = require("../utils/verify");



module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    console.log(`------Deployer is ${deployer}------------`);


    const chainId = network.config.chainId;
    console.log(`------ChainId is ${chainId}------------`);

    const startingVotingDuration = 60000; // 500 secs.

    const args = [
        startingVotingDuration
    ]

    log("---------------------------Deploying Voting Contract-----------------------------");

    const voting = await deploy("Voting", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations:network.config.blockConfirmations || 1,
    })

    log("-------------------Successfully Deployed Voting Contract-------------------------");

    if (!developmentChains.includes(network.name) && process.env.POLYSCAN_API_KEY) {
        log("--------------------------------------------------------");
        await verify(voting.address, args);
        log("--------------------------------------------------------");
    }
}


module.exports.tags = ["all","voting"]