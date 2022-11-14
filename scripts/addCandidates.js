const {ethers,getNamedAccounts} = require("hardhat");


async function main(){
    const deployer = (await getNamedAccounts()).deployer;
    const votingContract = await ethers.getContract("Voting", deployer);
    const { contestant1, contestant2 } = await getNamedAccounts();
    console.log("--------------------Adding Candidates--------------------");
    const tx1 = await votingContract.addCandidate(
		contestant1,
		"candidate1",
		"c1Image",
		"c1URL",
		{gasLimit:3e7}
	);
    await tx1.wait(1);

    const tx2 = await votingContract.addCandidate(
        contestant2,
        "candidate2",
        "c2Image",
        "c2URL"
    )
    await tx2.wait(1);
    console.log("--------------------Added Candidates--------------------");
}



main().then(()=>{
    process.exit(0);
}).catch((error)=>{
    console.log(error);
    process.exit(1);
})