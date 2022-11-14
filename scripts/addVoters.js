const {ethers,getNamedAccounts} = require("hardhat");


async function main(){
    const deployer = (await getNamedAccounts()).deployer;
    const voting = await ethers.getContract("Voting",deployer);
    console.log("-------------------------------------")
    const allAccounts = await ethers.getSigners();
    for(let x = 3;x<allAccounts.length-4;x++){
        
        console.log(`Adding Voter with address ${allAccounts[x].address}`);
        const txResponse = await voting.addVoter(
            allAccounts[x].address,
            `voter${x}`,
            `ipfsURLofVoter${x}`,
        )
        await txResponse.wait(1);
    }
    console.log("--------------------------------------");
    
    
}

main().then(()=>{
    process.exit(0);
}).catch((error)=>{
    console.log(error);
    process.exit(1);
})