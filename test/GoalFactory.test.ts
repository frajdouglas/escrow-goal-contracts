import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai"; // We'll still use expect from chai if it's installed
import hre from "hardhat";
import { Contract } from "ethers";

describe("GoalFactory", function () {
    let GoalFactory: any;
    let goalFactory: Contract;
    let owner: any; // Using 'any' as we don't have SignerWithAddress explicitly imported
    let creator: any;
    let referee: any;
    let successRecipient: any;
    let failureRecipient: any;
    const escrowAmount = hre.ethers.parseEther("1.0");
    const goalDescription = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Achieve a specific goal"));
    const futureExpiry = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7); // 7 days in the future
    const pastExpiry = Math.floor(Date.now() / 1000) - 60; // 1 minute in the past

    async function deployGoalFactoryFixture() {
        [owner, creator, referee, successRecipient, failureRecipient] = await hre.ethers.getSigners();
        GoalFactory = await hre.ethers.getContractFactory("GoalFactory");
        goalFactory = await GoalFactory.deploy();
        await goalFactory.waitForDeployment();
        return { goalFactory, owner, creator, referee, successRecipient, failureRecipient };
    }

    it("Should be deployed", async function () {
        const { goalFactory } = await loadFixture(deployGoalFactoryFixture);
        expect(goalFactory.address).to.not.equal("0x0000000000000000000000000000000000000000");
    });

    describe("createGoal", function () {
        it("Should allow a creator to successfully create a goal and emit GoalCreated event", async function () {
            const { goalFactory, creator, referee, successRecipient, failureRecipient } = await loadFixture(deployGoalFactoryFixture);

            await expect(
                goalFactory.connect(creator).createGoal(
                    referee.address,
                    successRecipient.address,
                    failureRecipient.address,
                    escrowAmount,
                    goalDescription,
                    futureExpiry,
                    { value: escrowAmount }
                )
            )
                .to.emit(goalFactory, "GoalCreated")
                .withArgs(
                    0,
                    creator.address,
                    referee.address,
                    successRecipient.address,
                    failureRecipient.address,
                    escrowAmount,
                    goalDescription,
                    anyValue, // Using anyValue for createdAt as it's dynamic
                    futureExpiry,
                    0
                );

            const goalDetails = await goalFactory.getGoalDetails(0);
            expect(goalDetails.successAddress).to.equal(successRecipient.address);
            expect(goalDetails.failureAddress).to.equal(failureRecipient.address);
            expect(goalDetails.escrowAmount).to.equal(escrowAmount);
            expect(goalDetails.expiryDate).to.equal(futureExpiry);
            expect(goalDetails.goalDescription).to.equal(goalDescription);
            expect(goalDetails.status).to.equal(0);
            expect(await goalFactory.getCreator(0)).to.equal(creator.address);
            expect(await goalFactory.getReferee(0)).to.equal(referee.address);
            expect(await goalFactory.goalCounter()).to.equal(1);
        });

        // ... (rest of the createGoal tests - they should work with 'hre.ethers.getSigners()' and 'loadFixture')
        it("Should revert with 'Incorrect escrow amount' if msg.value is not equal to _escrowAmount", async function () {
            const { goalFactory, creator, referee, successRecipient, failureRecipient } = await loadFixture(deployGoalFactoryFixture);
            await expect(
                goalFactory.connect(creator).createGoal(
                    referee.address,
                    successRecipient.address,
                    failureRecipient.address,
                    escrowAmount,
                    goalDescription,
                    futureExpiry,
                    { value: hre.ethers.parseEther("0.5") }
                )
            ).to.be.revertedWith("Incorrect escrow amount");
        });

        it("Should revert with 'Expiry date must be in the future' if _expiryDate is in the past", async function () {
            const { goalFactory, creator, referee, successRecipient, failureRecipient } = await loadFixture(deployGoalFactoryFixture);
            await expect(
                goalFactory.connect(creator).createGoal(
                    referee.address,
                    successRecipient.address,
                    failureRecipient.address,
                    escrowAmount,
                    goalDescription,
                    pastExpiry,
                    { value: escrowAmount }
                )
            ).to.be.revertedWith("Expiry date must be in the future");
        });

        it("Should revert with 'Invalid address provided' if any address is zero", async function () {
            const { goalFactory, creator, successRecipient, failureRecipient, referee } = await loadFixture(deployGoalFactoryFixture);
            await expect(
                goalFactory.connect(creator).createGoal(
                    hre.ethers.ZeroAddress,
                    successRecipient.address,
                    failureRecipient.address,
                    escrowAmount,
                    goalDescription,
                    futureExpiry,
                    { value: escrowAmount }
                )
            ).to.be.revertedWith("Invalid address provided");

            await expect(
                goalFactory.connect(creator).createGoal(
                    referee.address,
                    hre.ethers.ZeroAddress,
                    failureRecipient.address,
                    escrowAmount,
                    goalDescription,
                    futureExpiry,
                    { value: escrowAmount }
                )
            ).to.be.revertedWith("Invalid address provided");

            await expect(
                goalFactory.connect(creator).createGoal(
                    referee.address,
                    successRecipient.address,
                    hre.ethers.ZeroAddress,
                    escrowAmount,
                    goalDescription,
                    futureExpiry,
                    { value: escrowAmount }
                )
            ).to.be.revertedWith("Invalid address provided");
        });

        it("Should revert with 'Escrow amount must be greater than zero' if _escrowAmount is zero", async function () {
            const { goalFactory, creator, referee, successRecipient, failureRecipient } = await loadFixture(deployGoalFactoryFixture);
            await expect(
                goalFactory.connect(creator).createGoal(
                    referee.address,
                    successRecipient.address,
                    failureRecipient.address,
                    0,
                    goalDescription,
                    futureExpiry,
                    { value: 0 }
                )
            ).to.be.revertedWith("Escrow amount must be greater than zero");
        });
    });

    describe("setGoalMet", function () {
        let goalId: number;
        let fixture: any;
        beforeEach(async function () {
            fixture = await loadFixture(deployGoalFactoryFixture);
            const { goalFactory, creator, referee, successRecipient, failureRecipient } = fixture;
            const tx = await goalFactory.connect(creator).createGoal(
                referee.address,
                successRecipient.address,
                failureRecipient.address,
                escrowAmount,
                goalDescription,
                futureExpiry,
                { value: escrowAmount }
            );
            const receipt = await tx.wait();
            const goalCreatedEvent = receipt.events?.find((event) => event.event === "GoalCreated");
            goalId = goalCreatedEvent?.args?.uniqueId.toNumber();
        });

        it("Should allow the referee to set the goal as Met and transfer funds", async function () {
            const { goalFactory, referee, successRecipient } = fixture;
            const initialSuccessBalance = await hre.ethers.provider.getBalance(successRecipient.address);

            const tx = await goalFactory.connect(referee).setGoalMet(goalId);
            const receipt = await tx.wait();

            expect(receipt)
                .to.emit(goalFactory, "GoalStatusChanged")
                .withArgs(goalId, 1, anyValue); // Using anyValue for updatedAt
            expect(receipt)
                .to.emit(goalFactory, "FundsWithdrawn")
                .withArgs(goalId, successRecipient.address, escrowAmount, 4, anyValue); // Using anyValue for updatedAt

            const goalDetails = await goalFactory.getGoalDetails(goalId);
            expect(goalDetails.status).to.equal(4);
            expect(goalDetails.escrowAmount).to.equal(hre.ethers.BigNumber.from(0));

            const finalSuccessBalance = await hre.ethers.provider.getBalance(successRecipient.address);
            expect(finalSuccessBalance).to.equal(initialSuccessBalance.add(escrowAmount));
        });

        it("Should revert with 'Only referee can call this function' if called by anyone else", async function () {
            const { goalFactory, creator, successRecipient, failureRecipient, owner } = fixture;
            await expect(goalFactory.connect(creator).setGoalMet(goalId)).to.be.revertedWith("Only referee can call this function");
            await expect(goalFactory.connect(successRecipient).setGoalMet(goalId)).to.be.revertedWith("Only referee can call this function");
            await expect(goalFactory.connect(failureRecipient).setGoalMet(goalId)).to.be.revertedWith("Only referee can call this function");
            await expect(goalFactory.connect(owner).setGoalMet(goalId)).to.be.revertedWith("Only referee can call this function");
        });

        it("Should revert with 'Goal status is not Pending' if the goal is not pending", async function () {
            const { goalFactory, referee } = fixture;
            await goalFactory.connect(referee).setGoalMet(goalId); // Set to Met
            await expect(goalFactory.connect(referee).setGoalMet(goalId)).to.be.revertedWith("Goal status is not Pending");
        });
    });

    describe("withdrawFunds", function () {
        let goalId: number;
        let fixture: any;
        beforeEach(async function () {
            fixture = await loadFixture(deployGoalFactoryFixture);
            const { goalFactory, creator, referee, successRecipient, failureRecipient } = fixture;
            const tx = await goalFactory.connect(creator).createGoal(
                referee.address,
                successRecipient.address,
                failureRecipient.address,
                escrowAmount,
                goalDescription,
                futureExpiry,
                { value: escrowAmount }
            );
            const receipt = await tx.wait();
            console.log(receipt)
            const goalCreatedEvent = receipt.events?.find((event) => event.event === "GoalCreated");
            goalId = goalCreatedEvent?.args?.uniqueId.toNumber();

            await time.increaseTo(futureExpiry + 1);

        });

        it.only("Should allow the failure recipient to withdraw funds after expiry", async function () {
            const { goalFactory, failureRecipient } = fixture;
            const initialFailureBalance = await hre.ethers.provider.getBalance(failureRecipient.address);

            const tx = await goalFactory.connect(failureRecipient).withdrawFunds(goalId);
            const receipt = await tx.wait();

            expect(receipt)
                .to.emit(goalFactory, "GoalStatusChanged")
                .withArgs(goalId, 5, anyValue); // Using anyValue for updatedAt
            expect(receipt)
                .to.emit(goalFactory, "FundsWithdrawn")
                .withArgs(goalId, failureRecipient.address, escrowAmount, 5, anyValue); // Using anyValue for updatedAt

            const goalDetails = await goalFactory.getGoalDetails(goalId);
            expect(goalDetails.status).to.equal(5);
            expect(goalDetails.escrowAmount).to.equal(hre.ethers.BigNumber.from(0));

            const finalFailureBalance = await hre.ethers.provider.getBalance(failureRecipient.address);
            expect(finalFailureBalance).to.equal(initialFailureBalance.add(escrowAmount));
        });

        it("Should revert with 'Only failure recipient can call this function' if called by anyone else", async function () {
            const { goalFactory, creator, referee, successRecipient, owner, failureRecipient } = fixture;
            await expect(goalFactory.connect(creator).withdrawFunds(goalId)).to.be.revertedWith("Only failure recipient can call this function");
            await expect(goalFactory.connect(referee).withdrawFunds(goalId)).to.be.revertedWith("Only failure recipient can call this function");
            await expect(goalFactory.connect(successRecipient).withdrawFunds(goalId)).to.be.revertedWith("Only failure recipient can call this function");
            await expect(goalFactory.connect(owner).withdrawFunds(goalId)).to.be.revertedWith("Only failure recipient can call this function");
        });

        it("Should revert with 'Expiry date is not yet passed' if called before expiry", async function () {
            const { goalFactory, creator, referee, successRecipient, failureRecipient } = await loadFixture(deployGoalFactoryFixture);
            const futureGoalTx = await goalFactory.connect(creator).createGoal(
                referee.address,
                successRecipient.address,
                failureRecipient.address,
                escrowAmount,
                goalDescription,
                futureExpiry,
                { value: escrowAmount }
            );
            const futureGoalReceipt = await futureGoalTx.wait();
            const futureGoalCreatedEvent = futureGoalReceipt.events?.find((event) => event.event === "GoalCreated");
            const futureGoalId = futureGoalCreatedEvent?.args?.uniqueId.toNumber();

            await expect(goalFactory.connect(failureRecipient).withdrawFunds(futureGoalId)).to.be.revertedWith("Expiry date is not yet passed");
        });

        it("Should revert with 'Funds already withdrawn' if funds have already been withdrawn (success)", async function () {
            const { goalFactory, referee, failureRecipient } = fixture;
            await goalFactory.connect(referee).setGoalMet(goalId);
            await expect(goalFactory.connect(failureRecipient).withdrawFunds(goalId)).to.be.revertedWith("Funds already withdrawn");
        });

        it("Should revert with 'Funds already withdrawn' if funds have already been withdrawn (failure)", async function () {
            const { goalFactory, failureRecipient } = fixture;
            await goalFactory.connect(failureRecipient).withdrawFunds(goalId);
            await expect(goalFactory.connect(failureRecipient).withdrawFunds(goalId)).to.be.revertedWith("Funds already withdrawn");
        });

        it("Should revert with 'Funds cannot be withdrawn at this time' if the goal is not pending after expiry", async function () {
            const { goalFactory, creator, referee, successRecipient, failureRecipient } = await loadFixture(deployGoalFactoryFixture);
            await goalFactory.connect(referee).setGoalMet(goalId); // Set to Met (and funds withdrawn)
            const newPastExpiryGoalTx = await goalFactory.connect(creator).createGoal(
                referee.address,
                successRecipient.address,
                failureRecipient.address,
                escrowAmount,
                goalDescription,
                pastExpiry,
                { value: escrowAmount }
            );
            const newPastExpiryGoalReceipt = await newPastExpiryGoalTx.wait();
            const newPastExpiryGoalId = newPastExpiryGoalReceipt.events?.find((event) => event.event === "GoalCreated")?.args?.uniqueId.toNumber();

            await expect(goalFactory.connect(failureRecipient).withdrawFunds(newPastExpiryGoalId)).to.be.revertedWith("Funds cannot be withdrawn at this time");
        });
    });
});