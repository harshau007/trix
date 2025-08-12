# TriX Gaming Staking Platform

This project is a full-stack decentralized application (dApp) that implements a trustless staking and reward system for Player-vs-Player (PvP) gaming matches. It allows an operator to create matches, players to stake tokens, and ensures the winner automatically receives the entire pot.

## Project Architecture

The application is a monorepo-style project divided into four main components:

1.  **`contracts/`**: A Hardhat project containing the Solidity smart contracts that form the on-chain backbone of the system.

    - `GameToken.sol`: The ERC-20 token used for staking.
    - `TokenStore.sol`: The on-ramp for players to purchase GameTokens with a mock USDT.
    - `PlayGame.sol`: The core escrow contract that manages match creation, staking, and winner payouts.

2.  **`api/`**: A NestJS backend application that acts as the trusted "Operator" gateway. It exposes REST API endpoints for administrative actions like creating a match and reporting a winner.

3.  **`web/`**: A simple vanilla HTML and JavaScript frontend that serves as the user interface for both operators and players. It connects to MetaMask for all on-chain actions.

4.  **`tools/`**: A standalone Node.js script that acts as a leaderboard service. It listens to on-chain events from the `PlayGame` contract and serves a sorted leaderboard via a simple API endpoint.

## Prerequisites

- Node.js (v18 or higher recommended)
- NPM (comes with Node.js)
- MetaMask browser extension

## Setup and Installation

1.  **Clone the repository:**

    ```bash
    git clone <your-repo-url>
    cd <your-repo-name>
    ```

2.  **Install dependencies for all services:**
    You need to run `npm install` in three separate directories.

    ```bash
    # For the contracts
    cd contracts
    npm install
    cd ..

    # For the backend API
    cd api
    npm install
    cd ..

    # For the leaderboard tool
    cd tools
    npm install
    cd ..
    ```

3.  **Configure Environment Variables:**
    You need to create three separate `.env` files. Example templates (`.env.example`) should be created for each.

    - **In `contracts/`**: Create a `.env` file with your private key for deployment.
      ```
      PRIVATE_KEY=YOUR_DEPLOYMENT_PRIVATE_KEY_WITHOUT_0x
      ```
    - **In `api/`**: Create a `.env` file with the same private key and RPC URL. Contract addresses will be added after deployment.
      ```
      RPC_URL="[http://127.0.0.1:8545](http://127.0.0.1:8545)"
      OPERATOR_PRIVATE_KEY=YOUR_DEPLOYMENT_PRIVATE_KEY_WITHOUT_0x
      USDT_ADDRESS=""
      GAME_TOKEN_ADDRESS=""
      TOKEN_STORE_ADDRESS=""
      PLAY_GAME_ADDRESS=""
      ```
    - **In `tools/`**: Create a `.env` file with a WebSocket RPC URL and the `PlayGame` contract address (to be added after deployment).
      ```
      RPC_URL="ws://127.0.0.1:8545"
      PLAY_GAME_ADDRESS=""
      ```

## Running the Full Application (Local Development)

To run the full stack, you will need multiple terminals.

1.  **Terminal 1: Start the Local Blockchain**

    ```bash
    cd contracts
    npx hardhat node
    ```

    _Keep this terminal running._

2.  **Terminal 2: Deploy Smart Contracts**

    ```bash
    cd contracts
    npx hardhat run scripts/deploy.ts --network localhost
    ```

    \*This will print the deployed contract addresses. **Copy these addresses.**

3.  **Update `.env` and `app.js` Files**

    - Paste the new contract addresses into your `api/.env` and `tools/.env` files.
    - Paste the new contract addresses and all four contract ABIs into the configuration objects at the top of your `web/app.js` file.

4.  **Terminal 3: Start the Backend API**

    ```bash
    cd api
    npm run start:dev
    ```

    _Keep this terminal running._

5.  **Terminal 4: Start the Leaderboard Service**

    ```bash
    cd tools
    node leaderboard.js
    ```

    _Keep this terminal running._

6.  **Terminal 5: Start the Frontend**
    ```bash
    # Install serve if you haven't already: npm install -g serve
    cd web
    serve
    ```
    _This will provide a URL (e.g., `http://localhost:3000`). Open this URL in your browser._

## Usage Demo (Happy Path)

1.  **Setup MetaMask:** Import the private keys for the default Hardhat accounts (#0 and #1) into MetaMask and connect to the "Localhost 8545" network.
2.  **Create Match:** On the web page, use the "Operator Actions" panel to create a match using the addresses for Hardhat accounts #0 (as p1) and #1 (as p2).
3.  **Stake as Player 1:**
    - In MetaMask, switch to the account for Player 1 (`0xf39...`).
    - On the web page, connect the wallet.
    - Use the "Buy GT" button to get tokens, then use the "Stake for Match" button. Approve both transactions in MetaMask.
4.  **Stake as Player 2:**
    - In MetaMask, switch to the account for Player 2 (`0x709...`).
    - Refresh the web page and reconnect the wallet.
    - Repeat the "Buy GT" and "Stake" process.
5.  **Submit Result:** Once both players have staked, use the "Operator Actions" panel to submit the winner.
6.  **Check Leaderboard:** Navigate to `http://localhost:4000/leaderboard` in your browser to see the event listener's results.
