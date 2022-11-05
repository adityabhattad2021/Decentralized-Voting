const { run } = require("hardhat");


const verify = async (contractAddress, args) => {
    console.log("Trying to verify contract...");
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments:args,
        })
    } catch (error) {
        if (error.message.toLowerCase().include("already verified")) {
            console.log("Contract Already Verified");
        } else {
            console.log(error);
        }
    }
}


module.exports = {verify}