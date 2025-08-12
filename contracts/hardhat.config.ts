import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";

import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;

// Check if the private key is provided, which is mandatory for testnets
if (!PRIVATE_KEY) {
  // This warning is helpful for local development
  console.warn(
    "WARNING: PRIVATE_KEY not found in .env file. Using default accounts for deployment."
  );
}

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      // For the 'localhost' network, Hardhat automatically uses its own test accounts.
      // You don't need to specify a private key here.
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : [],
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "", // Use the RPC URL from .env
      // If a private key is found in .env, use it. Otherwise, use an empty array.
      // The `0x` prefix is required by Hardhat/Ethers in this accounts array.
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : [],
    },
  },
};

export default config;
