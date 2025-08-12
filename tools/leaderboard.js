// tools/leaderboard.js
require("dotenv").config();
const { ethers, WebSocketProvider } = require("ethers");
const http = require("http");

// --- CONFIGURATION ---
const PLAY_GAME_ADDRESS = process.env.PLAY_GAME_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const PORT = 4000; // Port for the leaderboard API

// ABI for the PlayGame contract (only the events we need)
const PLAY_GAME_ABI = [
  "event Settled(bytes32 indexed matchId, address indexed winner)",
  "event MatchCreated(bytes32 indexed matchId, address p1, address p2, uint256 stake)",
];

// --- IN-MEMORY DATABASE ---
// In a real app, you would use a persistent database like SQLite or Postgres.
const leaderboard = {};
// { "0xPlayerAddress": { wins: 0, totalGTWon: 0n, matchesPlayed: 0 } }
const matchStakes = {};
// { "0xMatchId": 1000000000000000000n }

// --- MAIN LOGIC ---
async function main() {
  if (!PLAY_GAME_ADDRESS || !RPC_URL) {
    console.error(
      "Error: Please set PLAY_GAME_ADDRESS and RPC_URL in the .env file."
    );
    return;
  }

  console.log("Starting leaderboard service...");
  const provider = new WebSocketProvider(RPC_URL);
  const contract = new ethers.Contract(
    PLAY_GAME_ADDRESS,
    PLAY_GAME_ABI,
    provider
  );

  // Initialize player data helper
  const initPlayer = (address) => {
    if (!leaderboard[address]) {
      leaderboard[address] = { wins: 0, totalGTWon: 0n, matchesPlayed: 0 };
    }
  };

  console.log(
    `Listening for events on PlayGame contract at ${PLAY_GAME_ADDRESS}...`
  );

  // Listen for MatchCreated to know the stake amount
  contract.on("MatchCreated", (matchId, p1, p2, stake, event) => {
    console.log(
      `[EVENT] MatchCreated: ${matchId}, Stake: ${ethers.formatUnits(
        stake,
        18
      )}`
    );
    matchStakes[matchId] = stake;
    initPlayer(p1);
    initPlayer(p2);
    leaderboard[p1].matchesPlayed += 1;
    leaderboard[p2].matchesPlayed += 1;
  });

  // Listen for Settled events to update the leaderboard
  contract.on("Settled", (matchId, winner, event) => {
    const stake = matchStakes[matchId] || 0n;
    const totalPot = stake * 2n;

    console.log(
      `[EVENT] Settled: ${matchId}, Winner: ${winner}, Pot: ${ethers.formatUnits(
        totalPot,
        18
      )}`
    );

    initPlayer(winner);
    leaderboard[winner].wins += 1;
    leaderboard[winner].totalGTWon += totalPot;
  });

  // Start the API server
  startServer();
}

// --- API SERVER ---
function startServer() {
  const server = http.createServer((req, res) => {
    if (req.url === "/leaderboard" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*"); // Allow frontend to access

      const sortedLeaderboard = Object.entries(leaderboard)
        .map(([address, data]) => ({
          address,
          wins: data.wins,
          // Convert BigInt to string for JSON serialization
          totalGTWon: ethers.formatUnits(data.totalGTWon, 18),
          matchesPlayed: data.matchesPlayed,
        }))
        .sort((a, b) => parseFloat(b.totalGTWon) - parseFloat(a.totalGTWon))
        .slice(0, 10); // Top 10

      res.writeHead(200);
      res.end(JSON.stringify(sortedLeaderboard));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  });

  server.listen(PORT, () => {
    console.log(`Leaderboard API server running at http://localhost:${PORT}`);
  });
}

main().catch(console.error);
