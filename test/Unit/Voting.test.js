const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
	? describe.skip
	: describe("Voting Contract Unit Tests", function () {
			let votingContract, deployer;
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

					const txAddContestent = await votingContract.addCandidate(
						contestant,
						"Name",
						"Image",
						"ipfsURL"
					);
					await txAddContestent.wait(1);

					const txVoter = await votingContract.addVoter(
						registeredVoter.address,
						"Name",
						"ipfsURL"
					);
					await txVoter.wait(1);
				});

				it("Throws error if tried to give vote after winner is picked", async function () {
					network.provider.send("evm_increaseTime", [600]);
					network.provider.send("evm_mine", []);

					const tx = await votingContract.performUpkeep([]);
					await tx.wait(1);

					const contractConnectedToVoter =
						await votingContract.connect(registeredVoter);

					await expect(
						contractConnectedToVoter.giveVote("1")
					).to.be.revertedWithCustomError(
						votingContract,
						"Voting__VotingClosed"
					);
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

			describe("Pick Winner", function () {
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
						await tx.wait(1);

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
					it("Changes is winner picked back to false.", async function () {
						const newIsWinnerPickedStatus =
							await votingContract.getIsWinnerPickedStatus();
						assert.equal(newIsWinnerPickedStatus, false);
					});
					it("Sets new is voting time peroid correctly.", async function () {
						const newVotingTimePeriod =
							await votingContract.getVotingCurrentVotingDuration();
						assert.equal(
							newVotingTimePeriod,
							votingTimePeriodInSec
						);
					});

					it("Sets the voting time stamp to current time.", async function () {
						const newVotingTimeStamp =
							await votingContract.getLastVotingTimeStamp();

						const blockNumAfter =
							await ethers.provider.getBlockNumber();
						const blockAfter = await ethers.provider.getBlock(
							blockNumAfter
						);
						const timestampAfter = blockAfter.timestamp;
						assert.equal(
							parseInt(newVotingTimeStamp),
							timestampAfter
						);
					});

					it("Clears the existing array of candidates as well as voters.", async function () {
						const allVotersLength =
							await votingContract.getVoterLength();
						const allCandidatesLength =
							await votingContract.getCandidateLength();

						assert.equal(parseInt(allVotersLength), 0);
						assert.equal(parseInt(allCandidatesLength), 0);
					});
				});
			});

			describe("Getter functions", function () {
				let votingRoundNumber, allAccounts;
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
					allAccounts = await ethers.getSigners();
					const firstStartIndex = 3;

					for (
						let i = firstStartIndex;
						i <= firstStartIndex + votesForFirstCandidate;
						i++
					) {
						const txRegistration = await votingContract.addVoter(
							allAccounts[i].address,
							`voter${i - 2}`,
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
							`voter${i - 2}`,
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

					votingRoundNumber =
						await votingContract.getCurrentVotingRoundNumber();
				});

				it("Throws error if candidate for entered candidate id does not exist.", async function () {
					const someNonExistantCnadidateId = 5;

					await expect(
						votingContract.getCandidateById(
							votingRoundNumber,
							someNonExistantCnadidateId
						)
					)
						.to.be.revertedWithCustomError(
							votingContract,
							"Voting__CandidateWithIdNotExists"
						)
						.withArgs(someNonExistantCnadidateId);
				});

				it("Throws error if the voter for entered voter id does not exist.", async function () {
					const someNonExistantVoterId = 52;

					await expect(
						votingContract.getVoterById(
							votingRoundNumber,
							someNonExistantVoterId
						)
					)
						.to.be.revertedWithCustomError(
							votingContract,
							"Voting__VoterWithIdNotExists"
						)
						.withArgs(someNonExistantVoterId);
				});

				it("Throws error if the voter with entered address does not exixts", async function () {
					const nonExistentVoterAddress = allAccounts[1].address;
					await expect(
						votingContract.getVoterByAddress(
							votingRoundNumber,
							nonExistentVoterAddress
						)
					)
						.to.be.revertedWithCustomError(
							votingContract,
							"Voting__VoterNotExists"
						)
						.withArgs(nonExistentVoterAddress);
				});
				
				it("Throws error if the voter with entered address does not exixts", async function () {
					const nonExistentVoterAddress = allAccounts[1].address;
					await expect(
						votingContract.hasVoterAreadyVoted(
							nonExistentVoterAddress
						)
					)
						.to.be.revertedWithCustomError(
							votingContract,
							"Voting__VoterNotExists"
						)
						.withArgs(nonExistentVoterAddress);
				});

				it("If candidate for given Id exists returns it correctly.", async function () {
					const candidate1Id = 1;
					const canditate1Name = "candidate1";
					const candidateNameFromContract = (
						await votingContract.getCandidateById(
							votingRoundNumber,
							candidate1Id
						)
					).name;

					assert.equal(canditate1Name, candidateNameFromContract);
				});

				it("If voter for given Id exists returns it correclty.", async function () {
					// As the voter with Id 1 will be voter 3 (because account 0=>Organiser,2=>contestent1,3=>contestant2)
					const voterNumber = 1;
					const voterName = "voter1";

					const voterFromContractName = (
						await votingContract.getVoterById(
							votingRoundNumber,
							voterNumber
						)
					).name;
					assert.equal(voterFromContractName, voterName);
				});

				it("Correctly returns candidate if provided candidate address.", async function () {
					const { contestant1: contestantAddress } =
						await getNamedAccounts();
					const contestantAddrFromContract = (
						await votingContract.getCandidateByAddress(
							votingRoundNumber,
							contestantAddress
						)
					).walletAddress;

					assert.equal(contestantAddress, contestantAddrFromContract);
				});

				it("Correctly returns voter if provided voter address.", async function () {
					// Accounts 3 onwards are for voters
					const someVoterAddress = allAccounts[5].address;

					const voterAddrFromContract = (
						await votingContract.getVoterByAddress(
							votingRoundNumber,
							someVoterAddress
						)
					).walletAddress;

					assert.equal(someVoterAddress, voterAddrFromContract);
				});

				it("Correclty returns all candidate array.", async function () {
					const correctLength = 2;
					const allCandidates =
						await votingContract.getAllCandidates();
					assert.equal(allCandidates.length, correctLength);
				});
				it("Correclty returns all Voter array.", async function () {
					const correctLength = 7;
					const allVoters = await votingContract.getAllVoters();
					console.log(allVoters.length, correctLength);
				});

				it("Correctly return voter registration status",async function(){
					const someVoterAddress = allAccounts[5].address;
					const isVoterRegistered = await votingContract.isVoterRegistered(
						votingRoundNumber,
						someVoterAddress
					)
					assert.equal(isVoterRegistered,1)
				})

				it("Correctly returns voter voting status",async function(){
					const someVoterAddress  =await allAccounts[5].address;
					const hasVoterVoted  = await votingContract.hasVoterAreadyVoted(
						someVoterAddress
					);
					console.log(hasVoterVoted);
					assert.equal(hasVoterVoted,1)
				})

			});
	  });
