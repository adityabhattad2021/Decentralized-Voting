// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

contract Voting {
    // Error
    error Voting__OnlyOrganiserCanCallThisFunction(
        address caller,
        address organiser
    );

    error Voting__CandidateWithIdNotExists(uint256 candidateId);

    error Voting__CanditateAlreadyExists(address candidateAddr);

    error Voting__VoterAlreadyExists(address VoterAddr);

    error Voting__VoterWithIdNotExists(uint256 voterId);

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

    using Counters for Counters.Counter;

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
    address[] public arrayOfCandidateAddresses;
    mapping(address => Candidate) public addressToCandidate;

    // Voter
    Counters.Counter private _voterCounter;
    address[] public arrayofVoterAddresses;
    struct Voter {
        uint256 id;
        string name;
        address walletAddress;
        bool alreadyVoted;
        string ipfsURL;
    }
    mapping(address => Voter) public addressToVoter;

    constructor() {
        votingOrganizer = msg.sender;
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

    function addCandidate(
        address _candidateAddress,
        string memory _name,
        string memory _image,
        string memory _ipfsURL
    ) public onlyOrganiser {
        if (addressToCandidate[_candidateAddress].walletAddress == msg.sender) {
            revert Voting__CanditateAlreadyExists(_candidateAddress);
        }
        _candidateCounter.increment();
        uint256 _id = _candidateCounter.current();
        Candidate storage candidate = addressToCandidate[_candidateAddress];
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
    ) public {
        if (addressToVoter[_voterAddress].walletAddress == _voterAddress) {
            revert Voting__VoterAlreadyExists(_voterAddress);
        }
        _voterCounter.increment();
        uint256 _id = _voterCounter.current();
        Voter storage voter = addressToVoter[_voterAddress];
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

    function giveVote(uint256 candidateId) public {
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
            !addressToVoter[msg.sender].alreadyVoted,
            "The msg sender has already voted"
        );

        uint candidateArryLength = arrayOfCandidateAddresses.length;
        bool voted = false;
        for (uint y = 0; y < candidateArryLength; ) {
            if (
                addressToCandidate[arrayOfCandidateAddresses[y]].id ==
                candidateId
            ) {
                addressToCandidate[arrayOfCandidateAddresses[y]].voteCount += 1;
                voted = true;
            }
            unchecked {
                y++;
            }
        }
        if (!voted) {
            revert Voting__CandidateWithIdNotExists(candidateId);
        }

        addressToVoter[msg.sender].alreadyVoted = voted;
        emit Voted(candidateId, msg.sender);
    }

    // getter functions
    function getAllCandidiates() public view returns (address[] memory) {
        return arrayOfCandidateAddresses;
    }

    function getCandidateLength() public view returns (uint256) {
        return arrayOfCandidateAddresses.length;
    }

    function getCandidateByAddress(address _candidateAddress)
        public
        view
        returns (Candidate memory)
    {
        return addressToCandidate[_candidateAddress];
    }

    function getCandidateById(uint256 candidateId)
        public
        view
        returns (Candidate memory)
    {
        uint256 lenOfCandidateArry = arrayOfCandidateAddresses.length;
        for (uint z = 0; z < lenOfCandidateArry; ) {
            if (
                addressToCandidate[arrayOfCandidateAddresses[z]].id ==
                candidateId
            ) {
                return addressToCandidate[arrayOfCandidateAddresses[z]];
            }
            unchecked {
                z++;
            }
        }
        revert Voting__CandidateWithIdNotExists(candidateId);
    }

    function getVoterById(uint256 voterId) public view returns(Voter memory){
        uint256 lengthOfVoterArry = arrayofVoterAddresses.length;
        for(uint a = 0;a<lengthOfVoterArry;){
            if(addressToVoter[arrayofVoterAddresses[a]].id==voterId){
                return addressToVoter[arrayofVoterAddresses[a]];
            }
            unchecked{
                a++;
            }
        }
        revert Voting__VoterWithIdNotExists(voterId);
    }

    function getVoterLength() public view returns(uint256){
        return arrayofVoterAddresses.length;
    }
}
