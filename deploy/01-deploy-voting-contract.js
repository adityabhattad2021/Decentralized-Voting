const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
require("dotenv").config();
const fs = require("fs");

const { verify } = require("../utils/verify");



module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    console.log(`------Deployer is ${deployer}------------`);


    const chainId = network.config.chainId;
    console.log(`------ChainId is ${chainId}------------`);

    const startingVotingDuration = 500; // 500 secs.

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

    log("---------------------Writing ABI------------------------");
    fs.writeFileSync("../nextjs-frontend/constants.js",`
        export const contractAddress = "${voting.address}";
        export const organiserAddress = "${deployer}";
    `)
    log("-----------ABI Successfully Updated---------------------");
    
}


module.exports.tags = ["all","voting"]