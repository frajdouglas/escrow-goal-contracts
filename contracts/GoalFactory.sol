// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GoalFactory {
    address public owner;
    uint256 public goalCounter;
    mapping(uint256 => Goal) public goals;
    mapping(uint256 => address) public goalCreators;
    mapping(uint256 => address) public goalReferees;

    struct Goal {
        address successRecipient;
        address failureRecipient;
        uint256 escrowAmount;
        uint256 expiry;
        bytes32 goalHash; // Goal Description (as hash)
        uint8 status; // 0: Pending, 1: Met, 4: Funds Withdrawn (Success), 5: Funds Withdrawn (Failure/Expiry)
    }

    struct GoalDetails {
        address successAddress;
        address failureAddress;
        uint256 escrowAmount;
        uint256 expiryDate;
        bytes32 goalDescription;
        uint8 status;
        address creatorAddress;
        address refereeAddress;
    }

    event GoalCreated(
        uint256 uniqueId,
        address creatorAddress,
        address refereeAddress,
        address successAddress,
        address failureAddress,
        uint256 escrowAmount,
        bytes32 goalDescription,
        uint256 createdAt,
        uint256 expiryDate,
        uint8 status
    );
    event GoalStatusChanged(uint256 uniqueId, uint8 status, uint256 updatedAt);
    event FundsWithdrawn(uint256 uniqueId, address withdrawalRecipient, uint256 withdrawalAmount, uint8 finalStatus, uint256 updatedAt);

    constructor() {
        owner = msg.sender;
        goalCounter = 0;
    }

    function createGoal(
        address _refereeAddress,
        address _successAddress,
        address _failureAddress,
        uint256 _escrowAmount,
        bytes32 _goalDescription,
        uint256 _expiryDate
    ) external payable {
        require(msg.value == _escrowAmount, "Incorrect escrow amount");
        require(_expiryDate > block.timestamp, "Expiry date must be in the future");
        require(_refereeAddress != address(0) && _successAddress != address(0) && _failureAddress != address(0), "Invalid address provided");
        require(_escrowAmount > 0, "Escrow amount must be greater than zero");

        goals[goalCounter] = Goal(_successAddress, _failureAddress, _escrowAmount, _expiryDate, _goalDescription, 0);
        goalCreators[goalCounter] = msg.sender;
        goalReferees[goalCounter] = _refereeAddress;

        emit GoalCreated(
            goalCounter,
            msg.sender,
            _refereeAddress,
            _successAddress,
            _failureAddress,
            _escrowAmount,
            _goalDescription,
            block.timestamp, // createdAt
            _expiryDate,
            0 // status: Pending
        );

        goalCounter++;
    }

    function setGoalMet(uint256 _uniqueId) external onlyReferee(_uniqueId) onlyPending(_uniqueId) {
        Goal storage goal = goals[_uniqueId];
        goal.status = 1;
        emit GoalStatusChanged(_uniqueId, 1, block.timestamp); // status: Met

        // Trigger the movement of funds to the successAddress
        payable(goal.successRecipient).transfer(goal.escrowAmount);
        goal.escrowAmount = 0;
        goal.status = 4; // status: Funds Withdrawn (Success)
        emit FundsWithdrawn(_uniqueId, goal.successRecipient, goal.escrowAmount, 4, block.timestamp);
    }

    function withdrawFunds(uint256 _uniqueId) external onlyFailureRecipient(_uniqueId) {
        Goal storage goal = goals[_uniqueId];
        require(goal.escrowAmount > 0, "Funds already withdrawn");

        // Cannot call the function if the expiry date is after the current date
        require(block.timestamp > goal.expiry, "Expiry date is not yet passed");

        if (goal.status == 0) {
            // Trigger the movement of funds to the failureAddress
            goal.status = 5; // status: Funds Claimed by Failure Address
            emit GoalStatusChanged(_uniqueId, 5, block.timestamp);
            payable(goal.failureRecipient).transfer(goal.escrowAmount);
            goal.escrowAmount = 0;
            emit FundsWithdrawn(_uniqueId, goal.failureRecipient, goal.escrowAmount, 5, block.timestamp);
        } else {
            revert("Funds cannot be withdrawn at this time");
        }
    }

    function getGoalDetails(uint256 _uniqueId) public view returns (GoalDetails memory) {
        require(goals[_uniqueId].expiry > 0, "Goal does not exist");
        Goal storage goal = goals[_uniqueId];
        return GoalDetails(
            goal.successRecipient,
            goal.failureRecipient,
            goal.escrowAmount,
            goal.expiry,
            goal.goalHash,
            goal.status,
            goalCreators[_uniqueId],
            goalReferees[_uniqueId]
        );
    }

    function getCreator(uint256 _uniqueId) public view returns (address) {
        return goalCreators[_uniqueId];
    }

    function getReferee(uint256 _uniqueId) public view returns (address) {
        return goalReferees[_uniqueId];
    }

    // --- Modifiers ---
    modifier onlyReferee(uint256 _goalId) {
        require(msg.sender == goalReferees[_goalId], "Only referee can call this function");
        _;
    }

    modifier onlyPending(uint256 _goalId) {
        require(goals[_goalId].status == 0, "Goal status is not Pending");
        _;
    }

    modifier onlyFailureRecipient(uint256 _goalId) {
        require(msg.sender == goals[_goalId].failureRecipient, "Only failure recipient can call this function");
        _;
    }
}