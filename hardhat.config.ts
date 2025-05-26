import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox"; // Or individual plugins like "@nomicfoundation/hardhat-verify"
import * as dotenv from "dotenv"; // Import dotenv for loading environment variables

// Load environment variables from .env file
dotenv.config();

// Access environment variables
const SEPOLIA_RPC_URL: string = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY: string = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.28", // Make sure this matches your contract's pragma version
  networks: {
    // This is the default local development network provided by Hardhat
    hardhat: {
      chainId: 31337, // Common chain ID for local Hardhat network
    },
    // Sepolia Testnet Configuration
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [], // Use private key if it exists, otherwise an empty array
      chainId: 11155111, // The official chain ID for Sepolia
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};

export default config;