const { ethers, network, getNamedAccounts, deployments } = require("hardhat");

async function mockVoting() {
	
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
	);
	await tx2.wait(1);

	console.log("--------------------Added Candidates--------------------");
	console.log("--------------------Voting Candidates--------------------");

	const candidate1Id = 1;
	const candidate2Id = 2;
	const votesForFirstCandidate = 3;
	const votesForSecondCandidate = 4;
	const allAccounts = await ethers.getSigners();
	const firstStartIndex = 3;

	for (
		let i = firstStartIndex;
		i <= firstStartIndex + votesForFirstCandidate;
		i++
	) {
		const txRegistration = await votingContract.addVoter(
			allAccounts[i].address,
			`voter${i}`,
			`ipfsURLofVoter${i}`
		);
		await txRegistration.wait(1);
		contractConnectedToVoter = votingContract.connect(allAccounts[i]);
		const tx = await contractConnectedToVoter.giveVote(candidate1Id,{gasLimit: 3e7});
		await tx.wait(1);
        console.log(`Voter ${i} voting....`);
	}
	for (
		let i = firstStartIndex + votesForFirstCandidate + 1;
		i <=
		firstStartIndex + votesForFirstCandidate + 1 + votesForSecondCandidate;
		i++
	) {
		const txRegistration = await votingContract.addVoter(
			allAccounts[i].address,
			`voter${i}`,
			`ipfsURLofVoter${i}`
		);
		await txRegistration.wait(1);
		contractConnectedToVoter = votingContract.connect(allAccounts[i]);
		const tx = await contractConnectedToVoter.giveVote(candidate2Id,{gasLimit: 3e7});
		await tx.wait(1);
        console.log(`Voter ${i} voting....`);

	}

    console.log("--------------------Voting Successfull--------------------");
    console.log("--------------------Selecting Winners--------------------");

	network.provider.send("evm_increaseTime", [600]);
	network.provider.send("evm_mine", []);

	const tx = await votingContract.performUpkeep([]);
	await tx.wait(1);

    const winnerId = await votingContract.getRoundWinnerById(1);
    const winner = await votingContract.getCandidateById(1,winnerId)
    console.log(`Winner is ${winner}`);
    console.log("---------------------------------------------------------");

}

mockVoting()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});
