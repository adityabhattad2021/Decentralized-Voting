# Decentralized Voting Contract

## Try it out

Step 1.
```shell
git clone https://github.com/adityabhattad2021/Decentralized-Voting.git
cd Decentralized-Voting
yarn
```

Step 2.
```Create a .env folder and configure the required keys```

Step 3.
 - To run tests:
```shell
hh test
```

 - To check coverage
```shell
hh coverage
```

- Mock entire voting process (single round)
```shell
hh node
hh run scripts/mockVoting.js --network localhost
```


 

### Interact with the smart contract using scripts.
 
 Step 1.
```shell
hh node
hh run scripts/mockVoting.js --network localhost
```
Step 2.
 - Start new round
```shell
hh node
hh run scripts/StartNewRound.js --network localhost
```
 - Add Candidates
```shell
hh node
hh run scripts/addCandidates.js --network localhost
```
 - Add Voters
```shell
hh node
hh run scripts/addVoters.js --network localhost
```
 - Cast vote
```shell
hh node
hh run scripts/castVote.js --network localhost
```
 - Mock chainlink keepers
```shell
hh node
hh run scripts/mockOffChain.js --network localhost
```



goerli testnet address: 0x1E24dFa8956A4deb6CbABDe49cf7f1F4822b3902
<br/>
[Frontend](https://github.com/adityabhattad2021/Chainlink-hackathon-frontend)
