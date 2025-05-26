import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"; // For better type hinting
import fs from "fs";

async function main() {
  console.log("======================================");
  console.log("🚀 Starting GoalFactory Seeding Script 🚀");
  console.log("======================================");

  // --- 1. Get Signers (Accounts) ---
  console.log("\n--- Getting Signers (Accounts) ---");
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

  console.log(`Contract will be deployed from: ${deployer.address}`);
  console.log(`Accounts available for various roles:`);
  console.log(`  Creator 1 (signers[1]): ${creator1.address}`);
  console.log(`  Creator 2 (signers[2]): ${creator2.address}`);
  console.log(`  Referee 1 (signers[3]): ${referee1.address}`);
  console.log(`  Referee 2 (signers[4]): ${referee2.address}`);
  console.log(`  Success Recipient 1 (signers[5]): ${successRecipient1.address}`);
  console.log(`  Success Recipient 2 (signers[6]): ${successRecipient2.address}`);
  console.log(`  Failure Recipient 1 (signers[7]): ${failureRecipient1.address}`);
  console.log(`  Failure Recipient 2 (signers[8]): ${failureRecipient2.address}`);

  // --- 2. Get the Contract Factory ---
  const GoalFactory = await ethers.getContractFactory("GoalFactory");

  // --- 3. Deploy the Contract ---
  console.log("\n--- Deploying GoalFactory Contract ---");
  const goalFactory = await GoalFactory.deploy();
  await goalFactory.waitForDeployment(); // Ensure the contract is fully deployed

  const contractAddress = await goalFactory.getAddress();
  console.log(`✅ GoalFactory deployed to: ${contractAddress}`);

    fs.writeFileSync(
        "./deployed/localhost.json",
        JSON.stringify({ contractAddress }, null, 2)
    );

  // --- 4. Define Helper Functions ---
  const defaultEscrowAmount = ethers.parseEther("0.05"); // Standard escrow amount (0.05 ETH)

  // Helper to create a future timestamp relative to the *current blockchain time*
  // This is crucial because blockchain time can be advanced independently of system time.
    const getFutureTimestampFromBlock = async (daysInFuture: number): Promise<number> => {
        const latestBlock = await ethers.provider.getBlock("latest");
        if (!latestBlock) throw new Error("Could not get latest block timestamp");

        const currentBlockTimestamp = latestBlock.timestamp; // Current blockchain timestamp in seconds
        const secondsToAdd = daysInFuture * 24 * 60 * 60;
        const calculatedFutureTimestamp = currentBlockTimestamp + secondsToAdd;
        const flooredFutureTimestamp = Math.floor(calculatedFutureTimestamp);


        console.log(`
        --- Timestamp Calculation Details ---`);
        console.log(`  Current Blockchain Timestamp (Unix): ${currentBlockTimestamp}`);
        console.log(`  Current Blockchain Date/Time: ${new Date(currentBlockTimestamp * 1000).toLocaleString()}`);
        console.log(`  Days to Add: ${daysInFuture}`);
        console.log(`  Seconds to Add: ${secondsToAdd}`);
        console.log(`  Calculated Future Timestamp (Unix, before floor): ${calculatedFutureTimestamp}`);
        console.log(`  Calculated Future Date/Time (before floor): ${new Date(calculatedFutureTimestamp * 1000).toLocaleString()}`);
        console.log(`  Floored Future Timestamp (Unix, after floor): ${flooredFutureTimestamp}`);
        console.log(`  Floored Future Date/Time (after floor): ${new Date(flooredFutureTimestamp * 1000).toLocaleString()}`);
        console.log(`  Did Math.floor change the value? ${calculatedFutureTimestamp !== flooredFutureTimestamp ? 'YES' : 'NO'}`);
        console.log(`-----------------------------------`);


        return flooredFutureTimestamp;
    };




//   const getFutureTimestampFromBlock = async (daysInFuture: number): Promise<number> => {
//     const latestBlock = await ethers.provider.getBlock("latest");
//     if (!latestBlock) throw new Error("Could not get latest block timestamp");
//     const currentBlockTimestamp = latestBlock.timestamp; // Current blockchain timestamp in seconds
//     console.log(`Current blockchain timestamp: ${new Date(currentBlockTimestamp * 1000).toLocaleString()}`);
//         console.log('days in future', daysInFuture);
// console.log('future timestamp before rounding', currentBlockTimestamp + (daysInFuture * 24 * 60 * 60))
// console.log('future timestamp before rounding', currentBlockTimestamp + (daysInFuture * 24 * 60 * 60))

//     // Ensure the result is an integer by using Math.floor()
//     return Math.floor(currentBlockTimestamp + (daysInFuture * 24 * 60 * 60));
//   };
//   console.log(getFutureTimestampFromBlock.toString(), 'getFutureTimestampFromBlock');

  // Helper to create a dummy goalHash (replace with real hashing logic in dApp)
  const createDummyGoalHash = (description: string): string => {
    // In a real application, this would be a hash of all goal details
    // (description, evidence requirements, rules, etc.)
    return ethers.keccak256(ethers.toUtf8Bytes(description));
  };

  // --- 5. Create Sample Goals (Following Scenarios A-F) ---
  console.log("\n--- Creating Sample Goals Based on Scenarios ---");
  let tx;
  let goalId;

  // --- Scenario A: Simple Active Goal (Pending, Future Expiry) ---
  console.log("\n[Scenario A]: Creating Simple Active Goal...");
  const goalA_description = "Read 5 books in 30 days";
  tx = await goalFactory.connect(creator1).createGoal(
    referee1.address,
    successRecipient1.address,
    failureRecipient1.address,
    defaultEscrowAmount,
    createDummyGoalHash(goalA_description),
    await getFutureTimestampFromBlock(30), // 30 days in future from current block.timestamp
    { value: defaultEscrowAmount }
  );
  await tx.wait();
  goalId = await goalFactory.goalCounter() - 1n; // Goal ID is current counter - 1
  console.log(`✅ Goal ID ${goalId} "${goalA_description}" created by ${creator1.address}. Status: Pending (0).`);

  // --- Scenario B: Successfully Met & Funds Withdrawn ---
  console.log("\n[Scenario B]: Creating and Marking Goal as Met, Funds Withdrawn...");
  const goalB_description = "Exercise 3 times a week for 2 months";
  const goalB_escrow = ethers.parseEther("0.1"); // Higher escrow for this one
  tx = await goalFactory.connect(creator2).createGoal(
    referee2.address,
    successRecipient2.address,
    failureRecipient2.address,
    goalB_escrow,
    createDummyGoalHash(goalB_description),
    await getFutureTimestampFromBlock(45), // 45 days in future from current block.timestamp
    { value: goalB_escrow }
  );
  await tx.wait();
  goalId = await goalFactory.goalCounter() - 1n;
  console.log(`   Goal ID ${goalId} "${goalB_description}" created by ${creator2.address}.`);

  // Mark Goal B as Met by referee2 (who is the referee for this goal)
  tx = await goalFactory.connect(referee2).setGoalMet(goalId);
  await tx.wait();
  console.log(`✅ Goal ID ${goalId} "${goalB_description}" marked as MET by ${referee2.address} and funds withdrawn to ${successRecipient2.address}. Status: Funds Withdrawn (Success) (4).`);


  // --- Scenario C: Expired & Claimable by Failure Recipient (Not Yet Claimed) ---
  console.log("\n[Scenario C]: Creating Goal, then Fast-Forwarding Time to Expire it (Unclaimed)...");
  const goalC_description = "Write 10 blog posts in 7 days";
  const goalC_escrow = ethers.parseEther("0.02"); // Smaller escrow
  // Create with a short future expiry (e.g., 1 day from current blockchain time)
  const goalC_shortFutureExpiry = await getFutureTimestampFromBlock(1);

  tx = await goalFactory.connect(creator1).createGoal(
    referee1.address,
    successRecipient1.address,
    failureRecipient1.address,
    goalC_escrow,
    createDummyGoalHash(goalC_description),
    goalC_shortFutureExpiry, // Use a short future expiry for contract creation
    { value: goalC_escrow }
  );
  await tx.wait();
  goalId = await goalFactory.goalCounter() - 1n;
  console.log(`   Goal ID ${goalId} "${goalC_description}" created. Expiry set to ${new Date(goalC_shortFutureExpiry * 1000).toLocaleString()}.`);

  // Now, fast-forward Hardhat Network's time past its expiry
  // We jump approximately 2 days.
  const secondsToAdvanceC = (2 * 24 * 60 * 60);
  await ethers.provider.send("evm_increaseTime", [secondsToAdvanceC]);
  await ethers.provider.send("evm_mine", []); // Mine a new block to apply the time change
  console.log(`✅ Goal ID ${goalId} "${goalC_description}" now expired on chain. Status: Pending (0). Awaiting claim by ${failureRecipient1.address}.`);


  // --- Scenario D: Failed Goal with Funds Withdrawn by Failure Recipient ---
  console.log("\n[Scenario D]: Creating Goal, Expiring it, and Withdrawing Funds...");
  const goalD_description = "Learn a new language in 1 day";
  const goalD_escrow = ethers.parseEther("0.03");
  // Create with a short future expiry (e.g., 1 day from current blockchain time AFTER C's jump)
  const goalD_shortFutureExpiry = await getFutureTimestampFromBlock(1);

  tx = await goalFactory.connect(creator2).createGoal(
    referee2.address,
    successRecipient2.address,
    failureRecipient2.address,
    goalD_escrow,
    createDummyGoalHash(goalD_description),
    goalD_shortFutureExpiry, // Use a short future expiry for contract creation
    { value: goalD_escrow }
  );
  await tx.wait();
  goalId = await goalFactory.goalCounter() - 1n;
  console.log(`   Goal ID ${goalId} "${goalD_description}" created. Expiry set to ${new Date(goalD_shortFutureExpiry * 1000).toLocaleString()}.`);

  // Now, fast-forward Hardhat Network's time past its expiry again
  // We jump approximately 2 days.
  const secondsToAdvanceD = (2 * 24 * 60 * 60);
  await ethers.provider.send("evm_increaseTime", [secondsToAdvanceD]);
  await ethers.provider.send("evm_mine", []); // Mine a new block to apply the time change
  console.log(`   Goal ID ${goalId} "${goalD_description}" now expired on chain.`);

  // Withdraw funds for Goal D by failureRecipient2 (who is the failure recipient for this goal)
  tx = await goalFactory.connect(failureRecipient2).withdrawFunds(goalId);
  await tx.wait();
  console.log(`✅ Goal ID ${goalId} "${goalD_description}" funds withdrawn by ${failureRecipient2.address}. Status: Funds Withdrawn (Failure) (5).`);


  // --- Scenario E: Goal Created by Referee (Active) ---
  console.log("\n[Scenario E]: Creating Goal with Referee as Creator...");
  const goalE_description = "Build a small dApp in 60 days";
  const goalE_escrow = ethers.parseEther("0.04");
  tx = await goalFactory.connect(referee1).createGoal( // creator is referee1
    referee2.address, // referee is referee2
    referee1.address, // success recipient is referee1
    failureRecipient1.address,
    goalE_escrow,
    createDummyGoalHash(goalE_description),
    await getFutureTimestampFromBlock(60), // 60 days in future from current block.timestamp
    { value: goalE_escrow }
  );
  await tx.wait();
  goalId = await goalFactory.goalCounter() - 1n;
  console.log(`✅ Goal ID ${goalId} "${goalE_description}" created by ${referee1.address} (who is also a referee for other goals). Status: Pending (0).`);


  // --- Scenario F: Creator is All Recipient Types (Active) ---
  console.log("\n[Scenario F]: Creating Goal with Creator as All Recipients...");
  const goalF_description = "Daily meditation for 30 days";
  const goalF_escrow = ethers.parseEther("0.01");
  tx = await goalFactory.connect(creator1).createGoal(
    referee2.address,
    creator1.address, // creator1 is success recipient
    creator1.address, // creator1 is failure recipient
    goalF_escrow,
    createDummyGoalHash(goalF_description),
    await getFutureTimestampFromBlock(30), // 30 days in future from current block.timestamp
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

// Standard Hardhat error handling for script execution
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});