// scripts/deploy.ts

import { ethers } from "hardhat";

async function main() {
  console.log("======================================");
  console.log("🚀 Starting GoalFactory Deployment 🚀");
  console.log("======================================");

  // --- 1. Get the Contract Factory ---
  // ethers.getContractFactory will return a Factory for your contract,
  // which is an object that can deploy a new instance of your contract.
  const GoalFactory = await ethers.getContractFactory("GoalFactory");

  // --- 2. Deploy the Contract ---
  // Call .deploy() on the factory to send the transaction that creates the contract.
  // If your GoalFactory constructor took arguments, you would pass them here:
  // const goalFactory = await GoalFactory.deploy(arg1, arg2, ...);
  console.log("\n--- Deploying GoalFactory Contract ---");
  const goalFactory = await GoalFactory.deploy();

  // --- 3. Wait for Deployment Confirmation ---
  // This waits for the transaction to be mined and the contract to be fully deployed.
  await goalFactory.waitForDeployment();

  // --- 4. Get and Log the Deployed Address ---
  const contractAddress = await goalFactory.getAddress();
  console.log(`✅ GoalFactory deployed to: ${contractAddress}`);

  console.log("\n======================================");
  console.log("🎉 Deployment Script Finished Successfully 🎉");
  console.log("======================================");
}

// Standard Hardhat error handling for script execution.
// This pattern ensures that any errors during the deployment process are logged
// and the Node.js process exits with an error code.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});