# Goal Tracker Smart Contract Development Environment

## Introduction

This repository contains the **`GoalFactory` smart contract**, designed to manage decentralized goal-based escrow agreements on the Ethereum blockchain. It allows users to create commitments by locking funds in escrow, which are then released to a designated recipient upon goal completion (as verified by a referee) or returned if the goal is not met by its expiry. The contract ensures secure, transparent, and trustless execution of these agreements.

---

## Getting Started

Follow these steps to set up, compile, and deploy the `GoalFactory` contract on your local development environment.

### Prerequisites

* **Node.js** (LTS version recommended)
* **npm** or **Yarn**
* **Git**

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/frajdouglas/escrow-goal-contracts.git
    cd your-repo-name # Navigate into your project directory
    ```
    (Ensure this directory contains your `contracts/` folder and `hardhat.config.js`).

2.  **Install project dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Environment Variables

Create a **`.env`** file in the root of your project:


    
    PRIVATE_KEY="YOUR_DEPLOYER_PRIVATE_KEY"
    

### Running Locally

1.  **Compile Contracts:**
    This command compiles your Solidity smart contracts into artifacts.
    ```bash
    npx hardhat compile
    ```

2.  **Start a Local Hardhat Network:**
    Open a **new terminal window** and run this command. This will start a personal Ethereum blockchain for development.
    ```bash
    npx hardhat node
    ```

3.  **Deploy Contracts to Local Network:**
    In your **first terminal window**, run the deployment script.
    ```bash
    npx hardhat run scripts/deploy.ts --network localhost
    ```
    (This assumes your deployment script is located at `scripts/deploy.ts`).

    Upon successful deployment, the console will output the address of your deployed `GoalFactory` contract. You can then interact with this contract using tools like Hardhat console or connect a dApp frontend to your `localhost` network.


## Utility Scripts

The `scripts/` directory contains helper scripts to simplify common development tasks.

* **`scripts/deployAndSeed.ts`**:
    This script serves a dual purpose:
    1.  It **deploys the `GoalFactory` smart contract** to your specified network (typically `localhost` for development).
    2.  Immediately after deployment, it **populates the contract with a variety of pre-configured goals** (e.g., active, successfully met, expired awaiting claim, and already withdrawn scenarios). It even simulates the passage of time on the local Hardhat network to demonstrate expired goals.
    This script is incredibly useful for quickly setting up a rich test environment for your dApp's frontend or for direct contract interaction.

* **`scripts/readGoals.ts`**:
    (Assuming this script exists as previously discussed) This script is designed to read data from the deployed `GoalFactory` contract. You can use it to query existing goals, check their current status, or retrieve specific details directly from the blockchain via the command line.
    * **Usage Example:** `npx hardhat run scripts/readGoals.ts --network localhost` 