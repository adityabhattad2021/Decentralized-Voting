const { ethers, getNamedAccounts } = require("hardhat");

async function main() {
	const deployer = (await getNamedAccounts()).deployer;
	const votingContract = await ethers.getContract("Voting", deployer);

	console.log("-----------------------------------------");
	console.log("Voting Started...");
	const allAccounts = await ethers.getSigners();
	const contractConnectedToVoter = votingContract.connect(allAccounts[6])
	
	const transectionResponse = await contractConnectedToVoter.giveVote(2);
	await transectionResponse.wait(1);
	console.log("Voting concluded");
	console.log("-------------------------------------");
}

main()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});
