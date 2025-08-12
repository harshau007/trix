// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PlayGame is Ownable, ReentrancyGuard {
    IERC20 public immutable gameToken;
    address public operator;
    uint256 public constant REFUND_TIMEOUT = 24 hours;

    enum Status { IDLE, CREATED, STAKED, SETTLED, REFUNDED }

    struct Match {
        address player1;
        address player2;
        uint256 stake;
        Status status;
        uint256 startTime; // Timestamp when match becomes fully STAKED
        address winner;
        bool p1_staked;
        bool p2_staked;
    }

    mapping(bytes32 => Match) public matches;

    event MatchCreated(bytes32 indexed matchId, address p1, address p2, uint256 stake);
    event Staked(bytes32 indexed matchId, address staker);
    event MatchStaked(bytes32 indexed matchId, uint256 startTime);
    event Settled(bytes32 indexed matchId, address winner);
    event Refunded(bytes32 indexed matchId);

    modifier onlyOperator() {
        require(msg.sender == operator, "PG: Caller is not the operator");
        _;
    }

    constructor(address _gameToken) Ownable(msg.sender) {
        gameToken = IERC20(_gameToken);
        operator = msg.sender; // Deployer is the initial operator
    }

    function setOperator(address _operator) public onlyOwner {
        operator = _operator;
    }

    function createMatch(bytes32 matchId, address p1, address p2, uint256 _stake) public onlyOperator {
        require(matches[matchId].status == Status.IDLE, "PG: Match ID exists");
        require(p1 != address(0) && p2 != address(0) && p1 != p2, "PG: Invalid players");
        require(_stake > 0, "PG: Stake must be positive");

        matches[matchId] = Match({
            player1: p1,
            player2: p2,
            stake: _stake, // Use _stake to update the struct field
            status: Status.CREATED,
            startTime: 0,
            winner: address(0),
            p1_staked: false,
            p2_staked: false
        });

        emit MatchCreated(matchId, p1, p2, _stake);
    }

    function stake(bytes32 matchId) public nonReentrant {
        Match storage currentMatch = matches[matchId];
        require(currentMatch.status == Status.CREATED, "PG: Match not created");
        
        bool isPlayer1 = (msg.sender == currentMatch.player1);
        bool isPlayer2 = (msg.sender == currentMatch.player2);
        require(isPlayer1 || isPlayer2, "PG: Not a player in this match");

        if (isPlayer1) require(!currentMatch.p1_staked, "PG: P1 already staked");
        if (isPlayer2) require(!currentMatch.p2_staked, "PG: P2 already staked");

        // Pull stake from the player
        bool success = gameToken.transferFrom(msg.sender, address(this), currentMatch.stake);
        require(success, "PG: GT transfer failed");

        if (isPlayer1) currentMatch.p1_staked = true;
        if (isPlayer2) currentMatch.p2_staked = true;
        
        emit Staked(matchId, msg.sender);

        // If both players have now staked, update the match status
        if (currentMatch.p1_staked && currentMatch.p2_staked) {
            currentMatch.status = Status.STAKED;
            currentMatch.startTime = block.timestamp;
            emit MatchStaked(matchId, block.timestamp);
        }
    }

    function commitResult(bytes32 matchId, address winner) public onlyOperator nonReentrant {
        Match storage currentMatch = matches[matchId];
        require(currentMatch.status == Status.STAKED, "PG: Match not fully staked");
        require(winner == currentMatch.player1 || winner == currentMatch.player2, "PG: Invalid winner");

        currentMatch.status = Status.SETTLED;
        currentMatch.winner = winner;

        uint256 totalPot = currentMatch.stake * 2;
        gameToken.transfer(winner, totalPot);

        emit Settled(matchId, winner);
    }

    function refund(bytes32 matchId) public nonReentrant {
        Match storage currentMatch = matches[matchId];
        require(currentMatch.status == Status.STAKED, "PG: Match not in a refundable state");
        require(block.timestamp > currentMatch.startTime + REFUND_TIMEOUT, "PG: Timeout not reached");

        currentMatch.status = Status.REFUNDED;

        // Refund both players
        gameToken.transfer(currentMatch.player1, currentMatch.stake);
        gameToken.transfer(currentMatch.player2, currentMatch.stake);

        emit Refunded(matchId);
    }
}