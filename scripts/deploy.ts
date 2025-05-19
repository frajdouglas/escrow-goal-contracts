// scripts/deploy.ts
import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const GoalFactory = await ethers.getContractFactory("GoalFactory");
  const goalFactory = await GoalFactory.deploy();
  await goalFactory.waitForDeployment();

  const address = await goalFactory.getAddress();
  console.log("✅ GoalFactory deployed to:", address);

  // Optional: Save address for frontend/backend
  fs.writeFileSync(
    "./deployed/localhost.json",
    JSON.stringify({ address }, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});