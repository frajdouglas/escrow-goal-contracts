
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("GoalFactory", function () {
  async function deployFixture() {
    const [owner, creator, referee, successRecipient, failureRecipient, other] = await ethers.getSigners();

    const GoalFactory = await ethers.getContractFactory("GoalFactory");
    const goalFactory = await GoalFactory.deploy();

    return {
      goalFactory,
      owner,
      creator,
      referee,
      successRecipient,
      failureRecipient,
      other
    };
  }

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      const { goalFactory, owner } = await loadFixture(deployFixture);
      expect(await goalFactory.owner()).to.equal(owner.address);
    });

    it("should initialize goalCounter to 0", async function () {
      const { goalFactory } = await loadFixture(deployFixture);
      expect(await goalFactory.goalCounter()).to.equal(0);
    });
  });

  describe("createGoal", function () {
    it("should create a goal successfully", async function () {
      const { goalFactory, referee, successRecipient, failureRecipient, creator } = await loadFixture(deployFixture);
      const escrow = ethers.parseEther("1");
      const expiry = (await time.latest()) + 86400;
      const goalHash = ethers.keccak256(ethers.toUtf8Bytes("Lose 10kg"));

      await goalFactory.connect(creator).createGoal(
        referee.address,
        successRecipient.address,
        failureRecipient.address,
        escrow,
        goalHash,
        expiry,
        { value: escrow }
      );

      const goal = await goalFactory.getGoal(0);
      expect(goal.successRecipient).to.equal(successRecipient.address);
      expect(goal.failureRecipient).to.equal(failureRecipient.address);
      expect(goal.creator).to.equal(creator.address);
      expect(goal.referee).to.equal(referee.address);
      expect(goal.escrowAmount).to.equal(escrow);
      expect(goal.expiry).to.equal(expiry);
      expect(goal.goalHash).to.equal(goalHash);
      expect(goal.status).to.equal(0);
    });

    it("should emit GoalCreated event", async function () {
      const { goalFactory, referee, successRecipient, failureRecipient, creator } = await loadFixture(deployFixture);
      const escrow = ethers.parseEther("1");
      const expiry = (await time.latest()) + 86400;
      const goalHash = ethers.keccak256(ethers.toUtf8Bytes("Climb Mt. Everest"));

      await expect(goalFactory.connect(creator).createGoal(
        referee.address,
        successRecipient.address,
        failureRecipient.address,
        escrow,
        goalHash,
        expiry,
        { value: escrow }
      )).to.emit(goalFactory, "GoalCreated");
    });

    it("should fail with mismatched escrow amount", async function () {
      const { goalFactory, referee, successRecipient, failureRecipient, creator } = await loadFixture(deployFixture);
      const escrow = ethers.parseEther("1");
      const goalHash = ethers.keccak256(ethers.toUtf8Bytes("Run 5k"));
      const expiry = (await time.latest()) + 86400;

      await expect(goalFactory.connect(creator).createGoal(
        referee.address,
        successRecipient.address,
        failureRecipient.address,
        escrow,
        goalHash,
        expiry,
        { value: ethers.parseEther("0.5") }
      )).to.be.revertedWith("Incorrect escrow amount");
    });

    it("should fail if expiry is in the past", async function () {
      const { goalFactory, referee, successRecipient, failureRecipient, creator } = await loadFixture(deployFixture);
      const escrow = ethers.parseEther("1");
      const goalHash = ethers.keccak256(ethers.toUtf8Bytes("Old Goal"));

      await expect(goalFactory.connect(creator).createGoal(
        referee.address,
        successRecipient.address,
        failureRecipient.address,
        escrow,
        goalHash,
        (await time.latest()) - 10,
        { value: escrow }
      )).to.be.revertedWith("Expiry must be in the future");
    });

    it("should fail if any address is zero", async function () {
      const { goalFactory, successRecipient, failureRecipient, creator } = await loadFixture(deployFixture);
      const escrow = ethers.parseEther("1");
      const goalHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));
      const expiry = (await time.latest()) + 86400;

      await expect(goalFactory.connect(creator).createGoal(
        ethers.ZeroAddress,
        successRecipient.address,
        failureRecipient.address,
        escrow,
        goalHash,
        expiry,
        { value: escrow }
      )).to.be.revertedWith("Invalid addresses");
    });
  });

  describe("getGoal", function () {
    it("should return correct goal data", async function () {
      const { goalFactory, creator, referee, successRecipient, failureRecipient } = await loadFixture(deployFixture);
      const escrow = ethers.parseEther("1");
      const expiry = (await time.latest()) + 1000;
      const goalHash = ethers.keccak256(ethers.toUtf8Bytes("Return data"));

      await goalFactory.connect(creator).createGoal(
        referee.address,
        successRecipient.address,
        failureRecipient.address,
        escrow,
        goalHash,
        expiry,
        { value: escrow }
      );

      const goal = await goalFactory.getGoal(0);
      expect(goal.creator).to.equal(creator.address);
    });

    it("should revert if goal does not exist", async function () {
      const { goalFactory } = await loadFixture(deployFixture);
      await expect(goalFactory.getGoal(999)).to.be.revertedWith("Goal does not exist");
    });
  });
});