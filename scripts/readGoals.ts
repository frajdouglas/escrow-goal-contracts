import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("======================================");
    console.log("📊 Starting GoalFactory Data Reader 📊");
    console.log("======================================");

    // --- 1. Get Signer (any signer will do for read-only ops) ---
    const [signer] = await ethers.getSigners();
    console.log(`Connected with account: ${signer.address}`);

    // --- 2. Read Contract Address ---
    const deployDir = "./deployed";
    const deployFilePath = path.join(deployDir, "localhost.json");

    if (!fs.existsSync(deployFilePath)) {
        console.error(`❌ Error: Contract address file not found at ${deployFilePath}`);
        console.error("Please run 'npx hardhat run scripts/seed.ts --network localhost' first to deploy and seed the contract.");
        process.exit(1);
    }

    const deployedData = JSON.parse(fs.readFileSync(deployFilePath, "utf8"));
    const contractAddress = deployedData.contractAddress;

    if (!contractAddress) {
        console.error(`❌ Error: 'address' not found in ${deployFilePath}`);
        process.exit(1);
    }

    console.log(`\n--- Connecting to GoalFactory at: ${contractAddress} ---`);

    // --- 3. Get the Contract Instance ---
    const GoalFactory = await ethers.getContractFactory("GoalFactory");
    const goalFactory = GoalFactory.attach(contractAddress); // Attach to the deployed contract

    // --- 4. Define Goal Status Mapping ---
    // This array MUST match your Solidity enum order and values exactly.
    // Based on your provided: 0: Pending, 1: Met, 4: Withdrawn (Success), 5: Withdrawn (Failure/Expired)
    const GoalStatus: { [key: number]: string } = {
        0: "Pending",
        1: "Met",
        4: "Withdrawn (Success)", // Using 4 for success as per your contract
        5: "Withdrawn (Failure/Expired)" // Using 5 for failure as per your contract
        // Add more if your enum has other states (e.g., if 2 or 3 were used)
    };


    // --- 5. Fetch and Display All Goals ---
    const goalCounter = await goalFactory.goalCounter();
    console.log(`\n--- Found ${goalCounter} goals in the contract ---`);

    if (goalCounter === 0n) {
        console.log("No goals found. The contract might not be seeded yet.");
        return;
    }

    for (let i = 0n; i < goalCounter; i++) {
        try {
            const goal = await goalFactory.getGoal(i);

            console.log(`\n--- Goal ID: ${i} ---`);
                        console.log(`\n--- Goal IN TOTAL: ${goal} ---`);

            console.log(`  Creator: ${goal.creator}`);
            console.log(`  Referee: ${goal.referee}`);
            console.log(`  Success Recipient: ${goal.successRecipient}`);
            console.log(`  Failure Recipient: ${goal.failureRecipient}`);
            console.log(`  Escrow Amount: ${ethers.formatEther(goal.escrowAmount)} ETH`);
            console.log(`  Goal Hash: ${goal.goalHash}`);
            console.log(`  Expiry: ${new Date(Number(goal.expiry) * 1000).toLocaleString()} (Unix: ${goal.expiry})`);
            const statusString = GoalStatus[Number(goal.status)] || `UNMAPPED_STATUS_${goal.status}`;
            console.log(`  Status: ${statusString} (${goal.status})`);
        } catch (error) {
            console.error(`❌ Error fetching goal ID ${i}:`, error);
        }
    }

    console.log("\n======================================");
    console.log("✅ Goal data reading complete! ✅");
    console.log("======================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});