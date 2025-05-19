// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GoalFactory {
    address public owner;
    uint256 public goalCounter;

    struct Goal {
        address successRecipient;
        address failureRecipient;
        address creator;
        address referee;
        uint256 escrowAmount;
        uint256 expiry;
        bytes32 goalHash;
        uint8 status; // 0: Pending, 1: Met, 4: Funds Withdrawn (Success), 5: Funds Withdrawn (Failure/Expiry)
    }

    mapping(uint256 => Goal) public goals;

    event GoalCreated(
        uint256 uniqueId,
        address creator,
        address referee,
        address successRecipient,
        address failureRecipient,
        uint256 escrowAmount,
        bytes32 goalHash,
        uint256 createdAt,
        uint256 expiry,
        uint8 status
    );

    event GoalStatusChanged(
        uint256 uniqueId,
        uint8 newStatus,
        uint256 updatedAt
    );

    event FundsWithdrawn(
        uint256 uniqueId,
        address recipient,
        uint256 amount,
        uint8 finalStatus,
        uint256 updatedAt
    );

    constructor() {
        owner = msg.sender;
        goalCounter = 0;
    }

    function createGoal(
        address _referee,
        address _successRecipient,
        address _failureRecipient,
        uint256 _escrowAmount,
        bytes32 _goalHash,
        uint256 _expiry
    ) external payable {
        require(msg.value == _escrowAmount, "Incorrect escrow amount");
        require(_expiry > block.timestamp, "Expiry must be in the future");
        require(
            _referee != address(0) &&
            _successRecipient != address(0) &&
            _failureRecipient != address(0),
            "Invalid addresses"
        );
        require(_escrowAmount > 0, "Escrow amount must be > 0");

        goals[goalCounter] = Goal({
            successRecipient: _successRecipient,
            failureRecipient: _failureRecipient,
            creator: msg.sender,
            referee: _referee,
            escrowAmount: _escrowAmount,
            expiry: _expiry,
            goalHash: _goalHash,
            status: 0
        });

        emit GoalCreated(
            goalCounter,
            msg.sender,
            _referee,
            _successRecipient,
            _failureRecipient,
            _escrowAmount,
            _goalHash,
            block.timestamp,
            _expiry,
            0
        );

        goalCounter++;
    }

    function setGoalMet(uint256 _goalId)
        external
        onlyReferee(_goalId)
        onlyPending(_goalId)
    {
        Goal storage goal = goals[_goalId];
        goal.status = 1;
        emit GoalStatusChanged(_goalId, 1, block.timestamp);

        payable(goal.successRecipient).transfer(goal.escrowAmount);
        uint256 withdrawnAmount = goal.escrowAmount;
        goal.status = 4;

        emit FundsWithdrawn(_goalId, goal.successRecipient, withdrawnAmount, 4, block.timestamp);
    }

    function withdrawFunds(uint256 _goalId) external onlyFailureRecipient(_goalId) {
        Goal storage goal = goals[_goalId];
        require(goal.escrowAmount > 0, "No funds to withdraw");
        require(block.timestamp > goal.expiry, "Goal has not yet expired");

        if (goal.status == 0) {
            goal.status = 5;
            emit GoalStatusChanged(_goalId, 5, block.timestamp);

            payable(goal.failureRecipient).transfer(goal.escrowAmount);
            uint256 withdrawnAmount = goal.escrowAmount;

            emit FundsWithdrawn(_goalId, goal.failureRecipient, withdrawnAmount, 5, block.timestamp);
        } else {
            revert("Funds cannot be withdrawn at this time");
        }
    }

    function getGoal(uint256 _goalId) public view returns (Goal memory) {
        require(_goalId < goalCounter, "Goal does not exist");
        return goals[_goalId];
    }

    // --- Modifiers ---
    modifier onlyReferee(uint256 _goalId) {
        require(msg.sender == goals[_goalId].referee, "Only referee can call this");
        _;
    }

    modifier onlyPending(uint256 _goalId) {
        require(goals[_goalId].status == 0, "Goal is not pending");
        _;
    }

    modifier onlyFailureRecipient(uint256 _goalId) {
        require(msg.sender == goals[_goalId].failureRecipient, "Only failure recipient can call this");
        _;
    }
}