const { ethers, network } = require("hardhat");

async function main() {
	const voting = await ethers.getContract("Voting");

    
	network.provider.send("evm_increaseTime", [6000000]); // time period.
	network.provider.send("evm_mine", []);

	const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
    const {upkeepNeeded} = await voting.checkUpkeep(checkData);

    if(upkeepNeeded){
        const roundNumber = await voting.getCurrentVotingRoundNumber();
        const transectionResponse = await voting.performUpkeep(checkData);
        const transectionRecipt = await transectionResponse.wait(1);
        const requestId = await transectionRecipt.events[0].args.requestId;
        console.log("-------------------------------------");
        console.log("Performed upkeep with requestId: ", requestId);
        console.log("-------------------------------------");
        const winnerId = await voting.getRoundWinnerById(roundNumber);
        const winner  = await voting.getCandidateById(roundNumber,winnerId);
        console.log("Winner of round ", parseInt(roundNumber), " is: ", winner.name);
        console.log("-------------------------------------");
    }else{
        console.log("No upkeep needed");
    }
}


main().then(()=>{
    process.exit(0);
}).catch((error)=>{
    console.log(error);
    process.exit(1);
})