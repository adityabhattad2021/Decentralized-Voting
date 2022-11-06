const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
	? describe.skip
	: describe("Voting Contract Unit Tests", function () {
			let votingContract, deployer, votingInitialInterval;
			const chainId = network.config.chainId;

			beforeEach(async function () {
				deployer = (await getNamedAccounts()).deployer;
				await deployments.fixture(["all"]);
				votingContract = await ethers.getContract("Voting", deployer);
			});

			describe("Constructor", function () {
				it("Ititializes sets deployer as voting organiser.", async function () {
					const votingOrganiser =
						await votingContract.votingOrganizer();

					assert.equal(votingOrganiser, deployer);
				});

				it("Initializes voting round number to one.", async function () {
					const votingRoundNumber =
						await votingContract.getCurrentVotingRoundNumber();

					assert.equal(parseInt(votingRoundNumber), 1);
				});

				it("Initialiazes voting starting time period as specified while deployment.", async function () {
					const votingStartingTimeperiod =
						await votingContract.getVotingCurrentVotingDuration();

					assert.equal(parseInt(votingStartingTimeperiod), 500);
				});
				it("Initializes voting status as active immediately after deployment.", async function () {
					const votingActiveStatus =
						await votingContract.getIsVotingActive();

					assert.equal(votingActiveStatus, true);
				});
				it("Initializes is winner picked as false immediately after deployment.", async function () {
					const isWinnerPicked =
						await votingContract.getIsWinnerPickedStatus();

					assert.equal(isWinnerPicked, false);
				});
			});

			describe("Adding a candidate", function () {
				it("Throws an error if called by anyone else other than deployer", async function () {
					const contestant = (await getNamedAccounts()).contestant1;
					const allAccounts = await ethers.getSigners();
					const votingConnectedToNotDeployer =
						await votingContract.connect(allAccounts[1]);
					await expect(
						votingConnectedToNotDeployer.addCandidate(
							contestant,
							"Name",
							"Image",
							"ipfsURL"
						)
					)
						.to.be.revertedWithCustomError(
							votingContract,
							"Voting__OnlyOrganiserCanCallThisFunction"
						)
						.withArgs(allAccounts[1].address, deployer);
				});
				it("Throws an error if try adding candidate after voting period is over", async function () {
					await network.provider.send("evm_increaseTime", [600]);
					await network.provider.send("evm_mine", []);

					const contestant = (await getNamedAccounts()).contestant1;

					await expect(
						votingContract.addCandidate(
							contestant,
							"Name",
							"Image",
							"ipfsURL"
						)
					).to.be.revertedWithCustomError(
						votingContract,
						"Voting__VotingTimePassed"
					);
				});
				it("Throws an error if tried to add the same candidate more than once.", async function () {
					const contestant = (await getNamedAccounts()).contestant1;

					const tx = await votingContract.addCandidate(
						contestant,
						"Name",
						"Image",
						"ipfsURL"
					);
					const txResponse = await tx.wait(1);

					await expect(
						votingContract.addCandidate(
							contestant,
							"Name",
							"Image",
							"ipfsURL"
						)
					)
						.to.be.revertedWithCustomError(
							votingContract,
							"Voting__CanditateAlreadyExists"
						)
						.withArgs(contestant);
				});

				it("Emits an event if candidate added successfully", async function () {
					const contestant = (await getNamedAccounts()).contestant1;

					await expect(
						votingContract.addCandidate(
							contestant,
							"Name",
							"Image",
							"ipfsURL"
						)
					).to.emit(votingContract, "CandidateCreated");
				});
			});

			describe("Adding a Voter", function () {
				it("Throws an error if same voter tries to register twice.", async function () {
					const allAccounts = await ethers.getSigners();
					const newVoter = allAccounts[1];

					const tx = await votingContract.addVoter(
						newVoter.address,
						"Name",
						"ipfsURL"
					);
					await tx.wait(1);

					await expect(
						votingContract.addVoter(
							newVoter.address,
							"Name",
							"ipfsURL"
						)
					)
						.to.be.revertedWithCustomError(
							votingContract,
							"Voting__VoterAlreadyExists"
						)
						.withArgs(newVoter.address);
				});
				it("Throws an error if tried to voter after voting period is over.", async function () {
					await network.provider.send("evm_increaseTime", [600]);
					await network.provider.send("evm_mine", []);

					const allAccounts = await ethers.getSigners();
					const newVoter = allAccounts[1];

					await expect(
						votingContract.addVoter(
							newVoter.address,
							"Name",
							"ipfsURL"
						)
					).to.be.revertedWithCustomError(
						votingContract,
						"Voting__VotingTimePassed"
					);
				});
				it("Emits an event if voter is successfully added.", async function () {
					const allAccounts = await ethers.getSigners();
					const newVoter = allAccounts[1];
					await expect(
						votingContract.addVoter(
							newVoter.address,
							"Name",
							"ipfsURL"
						)
					).to.emit(votingContract, "VoterCreated");
				});
			});

			describe("Give Vote", function () {
				let registeredVoter;
				beforeEach(async function () {
					const allAccounts = await ethers.getSigners();
					registeredVoter = allAccounts[1];

					const contestant = (await getNamedAccounts()).contestant1;

					const txContestent = await votingContract.addCandidate(
						contestant,
						"Name",
						"Image",
						"ipfsURL"
					);
					await txContestent.wait(1);

					const txVoter = await votingContract.addVoter(
						registeredVoter.address,
						"Name",
						"ipfsURL"
					);
					await txVoter.wait(1);
				});

				it("Throws an error if tried to voter after voting period is over.", async function () {
					await network.provider.send("evm_increaseTime", [600]);
					await network.provider.send("evm_mine", []);

					const allAccounts = await ethers.getSigners();
					const newVoter = allAccounts[1];

					const contractConnectedToVoter =
						await votingContract.connect(newVoter);

					await expect(
						contractConnectedToVoter.giveVote("1")
					).to.be.revertedWithCustomError(
						contractConnectedToVoter,
						"Voting__VotingTimePassed"
					);
				});

				it("Throws error if voter not registered before voting.", async function () {
					const notRegisteredVoter = (await ethers.getSigners())[2];

					const contractConnectedToVoter =
						await votingContract.connect(notRegisteredVoter);

					await expect(
						contractConnectedToVoter.giveVote("1")
					).to.be.revertedWith("You are not registered to vote");
				});

				it("Emits an event when successfully voted.", async function () {
					const contractConnectedToVoter =
						votingContract.connect(registeredVoter);

					await expect(contractConnectedToVoter.giveVote("1"))
						.to.emit(votingContract, "Voted")
						.withArgs("1", registeredVoter.address);
				});

				it("Throws error if voter tries to vote more than once", async function () {
					const contractConnectedToVoter =
						votingContract.connect(registeredVoter);

					const tx = await contractConnectedToVoter.giveVote("1");
					await tx.wait(1);

					await expect(
						contractConnectedToVoter.giveVote("1")
					).to.be.revertedWith("The msg sender has already voted");
				});

				it("Throw an error if candiate with passed ID not exists", async function () {
					const contractConnectedToVoter =
						votingContract.connect(registeredVoter);

					const nonExistantCandidateId = 0;

					await expect(
						contractConnectedToVoter.giveVote(
							nonExistantCandidateId
						)
					)
						.to.be.revertedWithCustomError(
							votingContract,
							"Voting__CandidateWithIdNotExists"
						)
						.withArgs(nonExistantCandidateId);
				});
			});

			// add 2 candidates 7 voters
			// 1->3
			// 2->4
			// pass voting time
			// mock as keepers
			// check event
			describe("Pick Winner", async function () {
				let correctWinnerCandidateId;
				beforeEach(async function () {
					const { contestant1, contestant2 } =
						await getNamedAccounts();

					const tx1 = await votingContract.addCandidate(
						contestant1,
						"candidate1",
						"c1Image",
						"c1URL"
					);
					await tx1.wait(1);

					const tx2 = await votingContract.addCandidate(
						contestant2,
						"candidate2",
						"c2Image",
						"c2URL"
					);
					await tx2.wait(1);

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
						contractConnectedToVoter = votingContract.connect(
							allAccounts[i]
						);
						const tx = await contractConnectedToVoter.giveVote(
							candidate1Id
						);
						await tx.wait(1);
					}
					for (
						let i = firstStartIndex + votesForFirstCandidate + 1;
						i <=
						firstStartIndex +
							votesForFirstCandidate +
							1 +
							votesForSecondCandidate;
						i++
					) {
						const txRegistration = await votingContract.addVoter(
							allAccounts[i].address,
							`voter${i}`,
							`ipfsURLofVoter${i}`
						);
						await txRegistration.wait(1);
						contractConnectedToVoter = votingContract.connect(
							allAccounts[i]
						);
						const tx = await contractConnectedToVoter.giveVote(
							candidate2Id
						);
						await tx.wait(1);
					}
					correctWinnerCandidateId = 2;
				});

				it("Throws error if enough time has not passed or voting active is set to false.", async function () {
					await expect(
						votingContract.performUpkeep([])
					).to.be.revertedWithCustomError(
						votingContract,
						"Voting__UpKeepNotNeeded"
					);
				});

				it("Correctly picks winner,changes voting active status to false, changes is winner picked to true, emits event and increases voting round number by one.", async function () {
					network.provider.send("evm_increaseTime", [600]);
					network.provider.send("evm_mine", []);

					const votingRoundNumberBefore =
						await votingContract.getCurrentVotingRoundNumber();
					const tx = await votingContract.performUpkeep([]);
					const txResponse = await tx.wait(1);

					const votingRoundNumberAfter =
						await votingContract.getCurrentVotingRoundNumber();
					const votingActiveStatus =
						await votingContract.getIsVotingActive();
					const winner = await votingContract.getRoundWinnerById(
						votingRoundNumberBefore
					);
					const winnerPickedStatus =
						await votingContract.getIsWinnerPickedStatus();

					assert.equal(correctWinnerCandidateId, winner);
					assert.equal(votingActiveStatus, false);
					assert.equal(txResponse.events[0].event, "WinnerPicked");
					assert.equal(
						parseInt(votingRoundNumberBefore) + 1,
						parseInt(votingRoundNumberAfter)
					);
					assert.equal(winnerPickedStatus, true);
				});
			});

			describe("Start New Voting Round", function () {
				const votingTimePeriodInSec = 500;
				it("Throws an error if called by anyone other than orgainser", async function () {
					const allAccounts = await ethers.getSigners();

					const contractConnectedToRandomUser =
						votingContract.connect(allAccounts[3]);

					await expect(
						contractConnectedToRandomUser.startNewVoting(
							votingTimePeriodInSec
						)
					)
						.to.be.revertedWithCustomError(
							votingContract,
							"Voting__OnlyOrganiserCanCallThisFunction"
						)
						.withArgs(allAccounts[3].address, deployer);
				});
				it("Throws an error if the function is called called before winner is picked", async function () {
					await expect(
						votingContract.startNewVoting(votingTimePeriodInSec)
					).to.be.revertedWithCustomError(
						votingContract,
						"Voting__CannotStartNewRoundWithoutBeforePickingWinner"
					);
				});

				// Changes voting active status to true, changes winner picked status to false, sets new voting time period, clears existing array of all candidates, clear existing array of all voter and emits event
				describe("When triggered successfully", function () {
					beforeEach(async function () {
						const { contestant1, contestant2 } =
							await getNamedAccounts();

						const tx1 = await votingContract.addCandidate(
							contestant1,
							"candidate1",
							"c1Image",
							"c1URL"
						);
						await tx1.wait(1);

						const tx2 = await votingContract.addCandidate(
							contestant2,
							"candidate2",
							"c2Image",
							"c2URL"
						);
						await tx2.wait(1);

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
							const txRegistration =
								await votingContract.addVoter(
									allAccounts[i].address,
									`voter${i}`,
									`ipfsURLofVoter${i}`
								);
							await txRegistration.wait(1);
							contractConnectedToVoter = votingContract.connect(
								allAccounts[i]
							);
							const tx = await contractConnectedToVoter.giveVote(
								candidate1Id
							);
							await tx.wait(1);
						}
						for (
							let i =
								firstStartIndex + votesForFirstCandidate + 1;
							i <=
							firstStartIndex +
								votesForFirstCandidate +
								1 +
								votesForSecondCandidate;
							i++
						) {
							const txRegistration =
								await votingContract.addVoter(
									allAccounts[i].address,
									`voter${i}`,
									`ipfsURLofVoter${i}`
								);
							await txRegistration.wait(1);
							contractConnectedToVoter = votingContract.connect(
								allAccounts[i]
							);
							const tx = await contractConnectedToVoter.giveVote(
								candidate2Id
							);
							await tx.wait(1);
						}
						correctWinnerCandidateId = 2;

						network.provider.send("evm_increaseTime", [600]);
						network.provider.send("evm_mine", []);

						const tx = await votingContract.performUpkeep([]);
						await tx.wait(1)

						const resetTransection =
							await votingContract.startNewVoting(
								votingTimePeriodInSec
							);
						await resetTransection.wait(1);
					});

					it("Changes voting active status back to true.", async function () {
						const newVotingStatus =
							await votingContract.getIsVotingActive();

						assert.equal(newVotingStatus, true);
					});
				});
			});
	  });
