// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

// Error
error Voting__OnlyOrganiserCanCallThisFunction(
    address caller,
    address organiser
);
error Voting__CandidateWithIdNotExists(uint256 candidateId);
error Voting__UpKeepNotNeeded(bool isActive, bool timePassed);
error Voting__CanditateAlreadyExists(address candidateAddr);
error Voting__VoterAlreadyExists(address VoterAddr);
error Voting__VoterWithIdNotExists(uint256 voterId);
error Voting__VotingClosed();
error Voting__VotingTimePassed(uint256 timePassed, uint256 votingDuration);
error Voting__CannotStartNewRoundWithoutBeforePickingWinner();

contract Voting is AutomationCompatibleInterface {
    using Counters for Counters.Counter;

    // Events.
    event CandidateCreated(
        uint256 indexed candidateId,
        address indexed candidateAddress,
        string candidateName,
        string candidateIpfsURL,
        string candidateImage
    );
    event VoterCreated(
        uint256 indexed voterId,
        address indexed voterAddress,
        bool indexed alreadyVoted,
        string voterName,
        string ipfsURL
    );
    event Voted(uint256 indexed candidateId, address indexed voterAddress);
    event NewVotingStarted(uint256 newVotingRoundNumber);
    event WinnerPicked(uint256 indexed winnerId);

    // Voting Record Variables.
    bool private isVotingActive;
    uint256 private votingTimePeriodInSeconds;
    uint256 private votingTimestamp;
    Counters.Counter private votingRoundNumber;
    mapping(uint256 => uint256) private roundNumberToWinnerId;
    bool private isWinnerPicked;

    // Candidate
    Counters.Counter private _candidateCounter;
    address public votingOrganizer;
    struct Candidate {
        uint256 id;
        string name;
        string image;
        address walletAddress;
        uint256 voteCount;
        string ipfsURL;
    }
    address[] private arrayOfCandidateAddresses;
    mapping(uint256 => mapping(address => Candidate))
        private addressToCandidate;
    // mapping(address => Candidate) private addressToCandidate;

    // Voter
    Counters.Counter private _voterCounter;
    address[] private arrayofVoterAddresses;
    struct Voter {
        uint256 id;
        string name;
        address walletAddress;
        bool alreadyVoted;
        string ipfsURL;
    }
    mapping(uint256 => mapping(address => Voter)) private addressToVoter;

    // mapping(address => Voter) private addressToVoter;

    /**
     * msg.sender is by default set to the voting orgainser, and has all the rights
     * The voting contract is by default active, for testing purpose
     */
    constructor(uint256 firstVoteTimePeriodInSec) {
        votingOrganizer = msg.sender;
        votingRoundNumber.increment();
        votingTimestamp = block.timestamp;
        votingTimePeriodInSeconds = firstVoteTimePeriodInSec;
        isWinnerPicked=false;
        isVotingActive = true;
    }

    modifier onlyOrganiser() {
        if (msg.sender != votingOrganizer) {
            revert Voting__OnlyOrganiserCanCallThisFunction(
                msg.sender,
                votingOrganizer
            );
        }
        _;
    }

    modifier checkVotingActive() {
        if (!isVotingActive) {
            revert Voting__VotingClosed();
        }
        _;
    }

    function addCandidate(
        address _candidateAddress,
        string memory _name,
        string memory _image,
        string memory _ipfsURL
    ) external onlyOrganiser checkVotingActive {
        if ((block.timestamp - votingTimestamp) > votingTimePeriodInSeconds) {
            revert Voting__VotingTimePassed(
                (block.timestamp - votingTimestamp),
                votingTimePeriodInSeconds
            );
        }
        uint256 _votingRoundNum = votingRoundNumber.current();
        if (
            addressToCandidate[_votingRoundNum][_candidateAddress]
                .walletAddress == _candidateAddress
        ) {
            revert Voting__CanditateAlreadyExists(_candidateAddress);
        }
        _candidateCounter.increment();
        uint256 _id = _candidateCounter.current();
        Candidate storage candidate = addressToCandidate[_votingRoundNum][
            _candidateAddress
        ];
        candidate.id = _id;
        candidate.name = _name;
        candidate.image = _image;
        candidate.walletAddress = _candidateAddress;
        candidate.ipfsURL = _ipfsURL;

        arrayOfCandidateAddresses.push(_candidateAddress);

        emit CandidateCreated(
            candidate.id,
            candidate.walletAddress,
            candidate.name,
            candidate.ipfsURL,
            candidate.image
        );
    }

    function addVoter(
        address _voterAddress,
        string memory _name,
        string memory _ipfsURL
    ) external checkVotingActive {
        if ((block.timestamp - votingTimestamp) > votingTimePeriodInSeconds) {
            revert Voting__VotingTimePassed(
                (block.timestamp - votingTimestamp),
                votingTimePeriodInSeconds
            );
        }
        uint256 _votingRoundNum = votingRoundNumber.current();
        if (
            addressToVoter[_votingRoundNum][_voterAddress].walletAddress ==
            _voterAddress
        ) {
            revert Voting__VoterAlreadyExists(_voterAddress);
        }
        _voterCounter.increment();
        uint256 _id = _voterCounter.current();
        Voter storage voter = addressToVoter[_votingRoundNum][_voterAddress];
        voter.id = _id;
        voter.name = _name;
        voter.walletAddress = _voterAddress;
        voter.ipfsURL = _ipfsURL;
        voter.alreadyVoted = false;

        arrayofVoterAddresses.push(_voterAddress);

        emit VoterCreated(
            voter.id,
            voter.walletAddress,
            voter.alreadyVoted,
            voter.name,
            voter.ipfsURL
        );
    }

    function giveVote(uint256 candidateId) external checkVotingActive {
        if ((block.timestamp - votingTimestamp) > votingTimePeriodInSeconds) {
            revert Voting__VotingTimePassed(
                (block.timestamp - votingTimestamp),
                votingTimePeriodInSeconds
            );
        }
        uint256 _votingRoundNum = votingRoundNumber.current();
        uint256 voterArryLen = arrayofVoterAddresses.length;
        bool voterExists = false;
        for (uint x = 0; x < voterArryLen; ) {
            if (arrayofVoterAddresses[x] == msg.sender) {
                voterExists = true;
            }
            unchecked {
                x++;
            }
        }
        require(voterExists, "You are not registered to vote");
        require(
            !addressToVoter[_votingRoundNum][msg.sender].alreadyVoted,
            "The msg sender has already voted"
        );

        uint candidateArryLength = arrayOfCandidateAddresses.length;
        bool voted = false;
        for (uint y = 0; y < candidateArryLength; ) {
            if (
                addressToCandidate[_votingRoundNum][
                    arrayOfCandidateAddresses[y]
                ].id == candidateId
            ) {
                addressToCandidate[_votingRoundNum][
                    arrayOfCandidateAddresses[y]
                ].voteCount += 1;
                voted = true;
            }
            unchecked {
                y++;
            }
        }
        if (!voted) {
            revert Voting__CandidateWithIdNotExists(candidateId);
        }

        addressToVoter[_votingRoundNum][msg.sender].alreadyVoted = voted;
        emit Voted(candidateId, msg.sender);
    }

    function pickWinner() internal checkVotingActive {
        uint256 _votingRoundNum = votingRoundNumber.current();
        uint lenOfCandidateArry = arrayOfCandidateAddresses.length;
        uint max = 0;
        uint indexOfCandidateWithMaxVotes;
        for (uint256 x = 0; x < lenOfCandidateArry; ) {
            if (
                addressToCandidate[_votingRoundNum][
                    arrayOfCandidateAddresses[x]
                ].voteCount > max
            ) {
                max = addressToCandidate[_votingRoundNum][
                    arrayOfCandidateAddresses[x]
                ].voteCount;
                indexOfCandidateWithMaxVotes = x;
            }
            unchecked {
                x++;
            }
        }
        roundNumberToWinnerId[_votingRoundNum] = addressToCandidate[
            _votingRoundNum
        ][arrayOfCandidateAddresses[indexOfCandidateWithMaxVotes]].id;

        isVotingActive = false;
        isWinnerPicked = true;
        emit WinnerPicked(
            addressToCandidate[_votingRoundNum][
                arrayOfCandidateAddresses[indexOfCandidateWithMaxVotes]
            ].id
        );
        votingRoundNumber.increment();
    }

    function startNewVoting(uint256 _votingTimePeriod)
        external
        onlyOrganiser
    {
        if(!isWinnerPicked){
            revert Voting__CannotStartNewRoundWithoutBeforePickingWinner();
        }
        isVotingActive = true;
        isWinnerPicked = false;
        votingTimePeriodInSeconds = _votingTimePeriod;
        votingTimestamp = block.timestamp;
        arrayOfCandidateAddresses = new address[](0);
        arrayofVoterAddresses = new address[](0);
        uint newVotingRoundNumber = votingRoundNumber.current();
        emit NewVotingStarted(newVotingRoundNumber);
    }

    // Chainlink Automation Functions.
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = isVotingActive;
        bool timePassed = ((block.timestamp - votingTimestamp) >
            votingTimePeriodInSeconds);
        upkeepNeeded = (isOpen && timePassed);
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Voting__UpKeepNotNeeded(
                isVotingActive,
                ((block.timestamp - votingTimestamp) >
                    votingTimePeriodInSeconds)
            );
        }
        pickWinner();
    }

    // getter functions
    function getAllCandidiates() public view returns (address[] memory) {
        return arrayOfCandidateAddresses;
    }

    function getCandidateLength() public view returns (uint256) {
        return arrayOfCandidateAddresses.length;
    }

    function getCandidateByAddress(
        uint256 _votingRoundNum,
        address _candidateAddress
    ) public view returns (Candidate memory) {
        return addressToCandidate[_votingRoundNum][_candidateAddress];
    }

    function getCandidateById(uint256 _votingRoundNum, uint256 candidateId)
        public
        view
        returns (Candidate memory)
    {
        uint256 lenOfCandidateArry = arrayOfCandidateAddresses.length;
        for (uint z = 0; z < lenOfCandidateArry; ) {
            if (
                addressToCandidate[_votingRoundNum][
                    arrayOfCandidateAddresses[z]
                ].id == candidateId
            ) {
                return
                    addressToCandidate[_votingRoundNum][
                        arrayOfCandidateAddresses[z]
                    ];
            }
            unchecked {
                z++;
            }
        }
        revert Voting__CandidateWithIdNotExists(candidateId);
    }

    function getVoterById(uint256 _votingRoundNum, uint256 voterId)
        public
        view
        returns (Voter memory)
    {
        uint256 lengthOfVoterArry = arrayofVoterAddresses.length;
        for (uint a = 0; a < lengthOfVoterArry; ) {
            if (
                addressToVoter[_votingRoundNum][arrayofVoterAddresses[a]].id ==
                voterId
            ) {
                return
                    addressToVoter[_votingRoundNum][arrayofVoterAddresses[a]];
            }
            unchecked {
                a++;
            }
        }
        revert Voting__VoterWithIdNotExists(voterId);
    }

    function getVoterByAddress(uint256 _votingRoundNum, address voterAddr)
        public
        view
        returns (Voter memory)
    {
        return addressToVoter[_votingRoundNum][voterAddr];
    }

    function getAllVoters() public view returns (address[] memory) {
        return arrayofVoterAddresses;
    }

    function getVoterLength() public view returns (uint256) {
        return arrayofVoterAddresses.length;
    }

    function getIsVotingActive() public view returns (bool) {
        return isVotingActive;
    }

    function getVotingCurrentVotingDuration() public view returns (uint256) {
        return votingTimePeriodInSeconds;
    }

    function getCurrentVotingRoundNumber() public view returns (uint256) {
        return votingRoundNumber.current();
    }

    function getRoundWinnerById(uint256 roundNumber)
        public
        view
        returns (uint256)
    {
        return roundNumberToWinnerId[roundNumber];
    }

    function getIsWinnerPickedStatus() public view returns(bool){
        return isWinnerPicked;
    }
}
