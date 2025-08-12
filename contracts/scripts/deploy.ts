import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Deployer's Private Key (from .env):", process.env.PRIVATE_KEY);

  // DEPLOY MOCK USDT (for local testing/testnets)
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUsdt = await MockUSDT.deploy();
  await mockUsdt.waitForDeployment();
  const mockUsdtAddress = await mockUsdt.getAddress();
  console.log(`MockUSDT deployed to: ${mockUsdtAddress}`);

  // 1. DEPLOY GameToken
  const GameToken = await ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy();
  await gameToken.waitForDeployment();
  const gameTokenAddress = await gameToken.getAddress();
  console.log(`GameToken deployed to: ${gameTokenAddress}`);

  // 2. DEPLOY TokenStore
  // Conversion Rate: 1e18 means 1 GT (18 decimals) per 1 USDT (which has 6 decimals, handled in contract)
  const gtPerUsdt = ethers.parseUnits("1", 18);
  const TokenStore = await ethers.getContractFactory("TokenStore");
  const tokenStore = await TokenStore.deploy(
    mockUsdtAddress,
    gameTokenAddress,
    gtPerUsdt
  );
  await tokenStore.waitForDeployment();
  const tokenStoreAddress = await tokenStore.getAddress();
  console.log(`TokenStore deployed to: ${tokenStoreAddress}`);

  // 3. DEPLOY PlayGame
  const PlayGame = await ethers.getContractFactory("PlayGame");
  const playGame = await PlayGame.deploy(gameTokenAddress);
  await playGame.waitForDeployment();
  const playGameAddress = await playGame.getAddress();
  console.log(`PlayGame deployed to: ${playGameAddress}`);

  // --- POST-DEPLOYMENT SETUP ---
  console.log("\n--- Starting post-deployment setup ---");

  // Grant TokenStore the right to mint GameTokens
  const tx1 = await gameToken.setTokenStore(tokenStoreAddress);
  await tx1.wait();
  console.log(
    `GameToken's store address set to TokenStore at ${tokenStoreAddress}`
  );

  // Note: The PlayGame contract's operator is the deployer by default.
  // The backend will use the deployer's private key.
  console.log(
    `PlayGame's operator is set to the deployer: ${deployer.address}`
  );

  console.log("\n--- Deployment and setup complete! ---");
  console.log(
    JSON.stringify(
      {
        mockUsdtAddress,
        gameTokenAddress,
        tokenStoreAddress,
        playGameAddress,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
