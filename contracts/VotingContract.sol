// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// Errors
error Voting__OnlyOrganiserCanCallThisFunction(
    address caller,
    address organiser
);
error Voting__CandidateWithIdNotExists(uint256 candidateId);
error Voting__UpKeepNotNeeded(bool isActive, bool timePassed);
error Voting__CanditateAlreadyExists(address candidateAddr);
error Voting__VoterAlreadyExists(address VoterAddr);
error Voting__VoterNotExists(address VoterAddr);
error Voting__VoterWithIdNotExists(uint256 voterId);
error Voting__VotingClosed();
error Voting__VotingTimePassed(uint256 timePassed, uint256 votingDuration);
error Voting__CannotStartNewRoundWithoutBeforePickingWinner();

/**
 * @title A Voting Smart Contract
 * @author Aditya Bhattad
 * @notice This is a fully secure voting smart contract
 * @dev This makes use of chainlink automation to automate the voting process
 */
contract Voting is AutomationCompatibleInterface {
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.AddressSet;

    // Events.
    event CandidateCreated(
        uint256 indexed candidateId,
        address indexed candidateAddress,
        string indexed candidateName,
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
    event NewVotingStarted(uint256 indexed newVotingRoundNumber);
    event WinnerPicked(uint256 indexed winnerId);

    // Voting Record Variables.
    address public votingOrganizer;
    bool private isVotingActive;
    uint256 private votingTimePeriodInSeconds;
    uint256 private votingTimestamp;
    Counters.Counter private votingRoundNumber;
    mapping(uint256 => uint256) private roundNumberToWinnerId;
    bool private isWinnerPicked;

    // Candidate Variables.
    Counters.Counter private _candidateCounter;
    struct Candidate {
        uint256 id;
        string name;
        string image;
        address walletAddress;
        uint256 voteCount;
        string ipfsURL;
    }
    mapping(uint256 => mapping(address => Candidate)) private addressToCandidate;
    mapping(uint256=>EnumerableSet.AddressSet) private arrayOfCandidateAddresses;

    // Old and unefficient way of storing candiates and voters.
    // mapping(address => Candidate) private addressToCandidate;

    // Voter Variables.
    Counters.Counter private _voterCounter;
    struct Voter {
        uint256 id;
        string name;
        address walletAddress;
        bool alreadyVoted;
        string ipfsURL;
    }
    mapping(uint256 => mapping(address => Voter)) private addressToVoter;
    mapping(uint256 => EnumerableSet.AddressSet) private arrayofVoterAddresses;

    // Old and unefficient way of storing candiates and voters.
    // mapping(address => Voter) private addressToVoter;

    constructor(uint256 firstVoteTimePeriodInSec) {
        votingOrganizer = msg.sender;
        votingRoundNumber.increment();
        votingTimestamp = block.timestamp;
        votingTimePeriodInSeconds = firstVoteTimePeriodInSec;
        isWinnerPicked = false;
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

    /**
     * @notice This function is used to create a new candidate
     * @param _name The name of the candidate
     * @param _image The image of the candidate
     * @param _candidateAddress The wallet address of the candidate
     * @param _ipfsURL The ipfs url of the candidate
     * @dev This function is only callable by the voting organizer
     * @dev This function emits the CandidateCreated event if executed successfully
     */
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

        arrayOfCandidateAddresses[_votingRoundNum].add(_candidateAddress);

        emit CandidateCreated(
            candidate.id,
            candidate.walletAddress,
            candidate.name,
            candidate.ipfsURL,
            candidate.image
        );
    }

    /**
     * @notice This function is used to create a new voter
     * @param _name The name of the voter
     * @param _voterAddress The wallet address of the voter
     * @param _ipfsURL The ipfs url of the voter
     * @dev This function can be called by anyone
     * @dev This function can be called only when the voting is active
     * @dev This function can be called only when the voting time period has not passed
     * @dev This function emits a VoterCreated event if executed successfully
     */
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

        arrayofVoterAddresses[_votingRoundNum].add(_voterAddress);

        emit VoterCreated(
            voter.id,
            voter.walletAddress,
            voter.alreadyVoted,
            voter.name,
            voter.ipfsURL
        );
    }

    /**
     * @notice This function is used to vote for a candidate
     * @param candidateId The id of the desired candidate
     * @dev This function can be called by anyone
     * @dev This function can be called only when the voting is active
     * @dev This function can be called only when the voting time period has not passed
     * @dev This function emits a Voted event if executed successfully
     */
    function giveVote(uint256 candidateId) external checkVotingActive {
        if ((block.timestamp - votingTimestamp) > votingTimePeriodInSeconds) {
            revert Voting__VotingTimePassed(
                (block.timestamp - votingTimestamp),
                votingTimePeriodInSeconds
            );
        }
        uint256 _votingRoundNum = votingRoundNumber.current();
        require(arrayofVoterAddresses[_votingRoundNum].contains(msg.sender), "You are not registered to vote");
        require(
            !addressToVoter[_votingRoundNum][msg.sender].alreadyVoted,
            "The msg sender has already voted"
        );

        uint candidateArryLength = arrayOfCandidateAddresses[_votingRoundNum].length();
        bool voted = false;
        for (uint y = 0; y < candidateArryLength; ) {
            if (
                addressToCandidate[_votingRoundNum][
                    arrayOfCandidateAddresses[_votingRoundNum].at(y)
                ].id == candidateId
            ) {
                addressToCandidate[_votingRoundNum][
                    arrayOfCandidateAddresses[_votingRoundNum].at(y)
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

    /**
     * @dev This function is to be called internally by performUpKeep.
     * @dev This function emits a WinnerPicked with winner candidate Id event if executed successfully
     */
    function pickWinner() internal checkVotingActive {
        uint256 _votingRoundNum = votingRoundNumber.current();
        uint lenOfCandidateArry = arrayOfCandidateAddresses[_votingRoundNum].length();
        uint max = 0;
        uint indexOfCandidateWithMaxVotes;
        for (uint256 x = 0; x < lenOfCandidateArry; ) {
            if (
                addressToCandidate[_votingRoundNum][
                    arrayOfCandidateAddresses[_votingRoundNum].at(x)
                ].voteCount > max
            ) {
                max = addressToCandidate[_votingRoundNum][
                    arrayOfCandidateAddresses[_votingRoundNum].at(x)
                ].voteCount;
                indexOfCandidateWithMaxVotes = x;
            }
            unchecked {
                x++;
            }
        }
        roundNumberToWinnerId[_votingRoundNum] = addressToCandidate[_votingRoundNum][arrayOfCandidateAddresses[_votingRoundNum].at(indexOfCandidateWithMaxVotes)].id;

        isVotingActive = false;
        isWinnerPicked = true;
        emit WinnerPicked(
            addressToCandidate[_votingRoundNum][
                arrayOfCandidateAddresses[_votingRoundNum].at(indexOfCandidateWithMaxVotes)
            ].id
        );
        votingRoundNumber.increment();
    }

    /**
     * @notice This function can be only called by the organiser of the voting
     * @notice This function can be called only when the winner of the last round has been picked.
     * @param _votingTimePeriod The time period for which the voting will be active
     * @dev This function resets the array of old candidates and voters.
     * @dev This function emits a NewVotingStarted event if executed successfully
     */
    function startNewVoting(uint256 _votingTimePeriod) external onlyOrganiser {
        if (!isWinnerPicked) {
            revert Voting__CannotStartNewRoundWithoutBeforePickingWinner();
        }
        isVotingActive = true;
        isWinnerPicked = false;
        votingTimePeriodInSeconds = _votingTimePeriod;
        votingTimestamp = block.timestamp;

        // This are no more needed as the voting round number changes array points at new location and the data in the old array remains accessible.
        // arrayOfCandidateAddresses = new address[](0);
        // arrayofVoterAddresses = new address[](0);
        _candidateCounter.reset();
        _voterCounter.reset();
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
    function getAllCandidates() public view returns (address[] memory) {
        uint256 _votingRoundNum = getCurrentVotingRoundNumber();
        return arrayOfCandidateAddresses[_votingRoundNum].values();
    }

    function getCandidateLength() public view returns (uint256) {
        uint256 _votingRoundNum = getCurrentVotingRoundNumber();
        return arrayOfCandidateAddresses[_votingRoundNum].length();
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
        uint256 lenOfCandidateArry = arrayOfCandidateAddresses[_votingRoundNum].length();
        for (uint z = 0; z < lenOfCandidateArry; ) {
            if (
                addressToCandidate[_votingRoundNum][
                    arrayOfCandidateAddresses[_votingRoundNum].at(z)
                ].id == candidateId
            ) {
                return
                    addressToCandidate[_votingRoundNum][
                        arrayOfCandidateAddresses[_votingRoundNum].at(z)
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
        uint256 lengthOfVoterArry = arrayofVoterAddresses[_votingRoundNum].length();
        for (uint a = 0; a < lengthOfVoterArry; ) {
            if (
                addressToVoter[_votingRoundNum][arrayofVoterAddresses[_votingRoundNum].at(a)].id ==
                voterId
            ) {
                return
                    addressToVoter[_votingRoundNum][arrayofVoterAddresses[_votingRoundNum].at(a)];
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
        if (addressToVoter[_votingRoundNum][voterAddr].id == 0) {
            revert Voting__VoterNotExists(voterAddr);
        }
        return addressToVoter[_votingRoundNum][voterAddr];
    }

    function isVoterRegistered(uint256 _votingRoundNum, address voterAddr)
        public
        view
        returns (bool)
    {
        return addressToVoter[_votingRoundNum][voterAddr].id != 0;
    }

    function hasVoterAreadyVoted(address voterAddr) public view returns (bool) {
        uint256 _votingRoundNum = getCurrentVotingRoundNumber();
        if (addressToVoter[_votingRoundNum][voterAddr].id == 0) {
            revert Voting__VoterNotExists(voterAddr);
        }
        return addressToVoter[_votingRoundNum][voterAddr].alreadyVoted;
    }

    function getAllVoters() public view returns (address[] memory) {
        uint256 _votingRoundNum = getCurrentVotingRoundNumber();
        return arrayofVoterAddresses[_votingRoundNum].values();
    }

    function getVoterLength() public view returns (uint256) {
        uint256 _votingRoundNum = getCurrentVotingRoundNumber();
        return arrayofVoterAddresses[_votingRoundNum].length();
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

    function getIsWinnerPickedStatus() public view returns (bool) {
        return isWinnerPicked;
    }

    function getLastVotingTimeStamp() public view returns (uint256) {
        return votingTimestamp;
    }
}
