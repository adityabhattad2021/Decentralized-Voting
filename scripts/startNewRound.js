const {ethers,getNamedAccounts}= require("hardhat");

const VOTING_DURATION=6000;


async function main(){
    console.log("Starting new round");
    const deployer = (await getNamedAccounts()).deployer;
    const voting  = await ethers.getContract("Voting",deployer);
    const txResponse = await voting.startNewVoting(VOTING_DURATION);
    await txResponse.wait(1);
    console.log("Voting Started");

}

main().then(()=>{
    process.exit(0);
}).catch((error)=>{
    console.log(error);
    process.exit(1);
})