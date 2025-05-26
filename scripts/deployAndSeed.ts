import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"; // For better type hinting
import fs from "fs";

async function main() {
  console.log("======================================");
  console.log("🚀 Starting GoalFactory Seeding Script 🚀");
  console.log("======================================");

  // --- 1. Get Signers (Accounts) ---
  console.log("\n--- Getting Signers ---");
  const signers: SignerWithAddress[] = await ethers.getSigners();

  const deployer = signers[0];
  const creator1 = signers[1];
  const creator2 = signers[2];
  const referee1 = signers[3];
  const referee2 = signers[4];
  const successRecipient1 = signers[5];
  const successRecipient2 = signers[6];
  const failureRecipient1 = signers[7];
  const failureRecipient2 = signers[8];

  console.log(`Deploying contract from: ${deployer.address}`);
  console.log(`Accounts available for roles:`);
  console.log(`  Creator 1: ${creator1.address}`);
  console.log(`  Creator 2: ${creator2.address}`);
  console.log(`  Referee 1: ${referee1.address}`);
  console.log(`  Referee 2: ${referee2.address}`);
  console.log(`  Success Recipient 1: ${successRecipient1.address}`);
  console.log(`  Success Recipient 2: ${successRecipient2.address}`);
  console.log(`  Failure Recipient 1: ${failureRecipient1.address}`);
  console.log(`  Failure Recipient 2: ${failureRecipient2.address}`);

  // --- 2. Get the Contract Factory ---
  const GoalFactory = await ethers.getContractFactory("GoalFactory");

  // --- 3. Deploy the Contract ---
  console.log("\n--- Deploying GoalFactory Contract ---");
  const goalFactory = await GoalFactory.deploy();
  await goalFactory.waitForDeployment(); // Ensure deployment is complete

  const contractAddress = await goalFactory.getAddress();
  console.log(`✅ GoalFactory deployed to: ${contractAddress}`);

  fs.writeFileSync(
    "./deployed/localhost.json",
    JSON.stringify({ contractAddress }, null, 2)
  );

  // --- 4. Define Helper Functions ---
  const defaultEscrowAmount = ethers.parseEther("0.05"); // 0.05 ETH for most goals

  // Helper to create a future timestamp (in seconds, as Solidity expects)
  const getFutureTimestamp = (daysInFuture: number): number => {
    const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    return now + (daysInFuture * 24 * 60 * 60); // Add days worth of seconds
  };

  // Helper to create a past timestamp (in seconds)
  const getPastTimestamp = (daysInPast: number): number => {
    const now = Math.floor(Date.now() / 1000);
    return now - (daysInPast * 24 * 60 * 60);
  };

  // Helper to create a dummy goalHash (replace with real hashing logic in dApp)
  const createDummyGoalHash = (description: string): string => {
    // In a real application, this would be a hash of all goal details (description, evidence, rules etc.)
    return ethers.keccak256(ethers.toUtf8Bytes(description));
  };

  // --- 5. Create Sample Goals (Following Scenarios A-F) ---
  console.log("\n--- Creating Sample Goals ---");
  let tx;
  let goalId;

  // --- Scenario A: Simple Active Goal (Pending, Future Expiry) ---
  console.log("\nScenario A: Creating Simple Active Goal...");
  const goalA_description = "Read 5 books in 30 days";
  tx = await goalFactory.connect(creator1).createGoal(
    referee1.address,
    successRecipient1.address,
    failureRecipient1.address,
    defaultEscrowAmount,
    createDummyGoalHash(goalA_description),
    getFutureTimestamp(30), // 30 days in future
    { value: defaultEscrowAmount }
  );
  await tx.wait();
  goalId = await goalFactory.goalCounter() - 1n;
  console.log(`✅ Goal ID ${goalId} "${goalA_description}" created by ${creator1.address}. Status: Pending (0).`);

  // --- Scenario B: Successfully Met & Funds Withdrawn ---
  console.log("\nScenario B: Creating and Marking Goal as Met, Funds Withdrawn...");
  const goalB_description = "Exercise 3 times a week for 2 months";
  const goalB_escrow = ethers.parseEther("0.1"); // Higher escrow for this one
  tx = await goalFactory.connect(creator2).createGoal(
    referee2.address,
    successRecipient2.address,
    failureRecipient2.address,
    goalB_escrow,
    createDummyGoalHash(goalB_description),
    getFutureTimestamp(45), // 45 days in future
    { value: goalB_escrow }
  );
  await tx.wait();
  goalId = await goalFactory.goalCounter() - 1n;
  console.log(`   Goal ID ${goalId} "${goalB_description}" created by ${creator2.address}.`);

  // Mark Goal B as Met by referee2
  tx = await goalFactory.connect(referee2).setGoalMet(goalId);
  await tx.wait();
  console.log(`✅ Goal ID ${goalId} "${goalB_description}" marked as MET by ${referee2.address} and funds withdrawn to ${successRecipient2.address}. Status: Funds Withdrawn (Success) (4).`);


  // --- Scenario C: Expired & Claimable by Failure Recipient (Not Yet Claimed) ---
  console.log("\nScenario C: Creating Expired but Unclaimed Goal...");
  const goalC_description = "Write 10 blog posts in 7 days";
  const goalC_escrow = ethers.parseEther("0.02"); // Smaller escrow
  tx = await goalFactory.connect(creator1).createGoal(
    referee1.address,
    successRecipient1.address,
    failureRecipient1.address,
    goalC_escrow,
    createDummyGoalHash(goalC_description),
    getPastTimestamp(7), // 7 days in the PAST
    { value: goalC_escrow }
  );
  await tx.wait();
  goalId = await goalFactory.goalCounter() - 1n;
  console.log(`✅ Goal ID ${goalId} "${goalC_description}" created by ${creator1.address}. Status: Pending (0), Expired. Awaiting claim by ${failureRecipient1.address}.`);


  // --- Scenario D: Failed Goal with Funds Withdrawn by Failure Recipient ---
  console.log("\nScenario D: Creating Failed Goal and Withdrawing Funds...");
  const goalD_description = "Learn a new language in 30 days";
  const goalD_escrow = ethers.parseEther("0.03");
  tx = await goalFactory.connect(creator2).createGoal(
    referee2.address,
    successRecipient2.address,
    failureRecipient2.address,
    goalD_escrow,
    createDummyGoalHash(goalD_description),
    getPastTimestamp(14), // 14 days in the PAST
    { value: goalD_escrow }
  );
  await tx.wait();
  goalId = await goalFactory.goalCounter() - 1n;
  console.log(`   Goal ID ${goalId} "${goalD_description}" created by ${creator2.address}.`);

  // Withdraw funds for Goal D by failureRecipient2
  tx = await goalFactory.connect(failureRecipient2).withdrawFunds(goalId);
  await tx.wait();
  console.log(`✅ Goal ID ${goalId} "${goalD_description}" funds withdrawn by ${failureRecipient2.address}. Status: Funds Withdrawn (Failure) (5).`);


  // --- Scenario E: Goal Created by Referee (Active) ---
  console.log("\nScenario E: Creating Goal with Referee as Creator...");
  const goalE_description = "Build a small dApp in 60 days";
  const goalE_escrow = ethers.parseEther("0.04");
  tx = await goalFactory.connect(referee1).createGoal( // referee1 is the creator here
    referee2.address, // referee2 is the referee
    referee1.address, // referee1 is also success recipient
    failureRecipient1.address,
    goalE_escrow,
    createDummyGoalHash(goalE_description),
    getFutureTimestamp(60),
    { value: goalE_escrow }
  );
  await tx.wait();
  goalId = await goalFactory.goalCounter() - 1n;
  console.log(`✅ Goal ID ${goalId} "${goalE_description}" created by ${referee1.address} (who is also a referee for other goals). Status: Pending (0).`);


  // --- Scenario F: Creator is All Recipient Types (Active) ---
  console.log("\nScenario F: Creating Goal with Creator as All Recipients...");
  const goalF_description = "Daily meditation for 30 days";
  const goalF_escrow = ethers.parseEther("0.01");
  tx = await goalFactory.connect(creator1).createGoal(
    referee2.address,
    creator1.address, // creator1 is success recipient
    creator1.address, // creator1 is failure recipient
    goalF_escrow,
    createDummyGoalHash(goalF_description),
    getFutureTimestamp(30),
    { value: goalF_escrow }
  );
  await tx.wait();
  goalId = await goalFactory.goalCounter() - 1n;
  console.log(`✅ Goal ID ${goalId} "${goalF_description}" created by ${creator1.address} (who is also both recipient). Status: Pending (0).`);


  console.log("\n======================================");
  console.log("🎉 Seeding Script Finished Successfully 🎉");
  console.log(`Total goals created: ${await goalFactory.goalCounter()}`);
  console.log("======================================");
}

// Standard Hardhat error handling
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});