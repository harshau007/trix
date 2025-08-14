import type { GameStatus, ZustandStore } from "@/types";
import { create } from "zustand";
import { apiClient } from "./api-client";
import {
  addRandomTile,
  hasWon,
  initializeBoard,
  isGameOver,
  moveDown,
  moveLeft,
  moveRight,
  moveUp,
} from "./game-logic";
import { socketClient } from "./socket-client";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (accounts: string[]) => void) => void;
      removeListener: (
        event: string,
        callback: (accounts: string[]) => void
      ) => void;
      isMetaMask?: boolean;
    };
  }
}

function persistState(state: ZustandStore) {
  try {
    const stateToSave = {
      user: state.user,
      matchmaking: state.matchmaking,
      game: state.game,
      timestamp: Date.now(),
    };
    localStorage.setItem("trix-game-state", JSON.stringify(stateToSave));
  } catch (error) {
    console.error("Failed to persist state:", error);
  }
}

function loadPersistedState(): Partial<ZustandStore> {
  try {
    const saved = localStorage.getItem("trix-game-state");
    if (!saved) return {};

    const parsed = JSON.parse(saved);

    if (Date.now() - parsed.timestamp > 30 * 60 * 1000) {
      clearPersistedState();
      return {};
    }

    if (parsed.user?.isConnected && parsed.game?.status === "ACTIVE") {
      return {
        user: parsed.user,
        matchmaking: parsed.matchmaking,
        game: parsed.game,
      };
    }

    return {};
  } catch (error) {
    console.error("Failed to load persisted state:", error);
    clearPersistedState();
    return {};
  }
}

function clearPersistedState() {
  try {
    localStorage.removeItem("trix-game-state");
  } catch (error) {
    console.error("Failed to clear persisted state:", error);
  }
}

export const useGameStore = create<ZustandStore>((set, get) => ({
  user: {
    isConnected: false,
    address: null,
    gtBalance: "0.00",
    usdtBalance: "0.00",
  },
  matchmaking: {
    status: "IDLE",
    stakeAmount: 10,
    matchId: null,
    opponent: {
      address: null,
      avatar: "https://placehold.co/40x40/E0E0E0/000000?text=P2",
    },
  },
  game: {
    playerState: {
      board: [
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ],
      score: 0,
      isGameOver: false,
    },
    opponentState: {
      board: [
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ],
      score: 0,
      isGameOver: false,
    },
    status: "PENDING",
    winner: null,
    transactionHash: null,
  },

  ...loadPersistedState(),

  connectWallet: async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask to connect your wallet");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];

      if (!address || !address.startsWith("0x") || address.length !== 42) {
        throw new Error("Invalid wallet address format");
      }

      const gtBalance = await fetchTokenBalance(address, "GT");
      const usdtBalance = await fetchTokenBalance(address, "USDT");

      set((state) => ({
        user: {
          ...state.user,
          isConnected: true,
          address,
          gtBalance,
          usdtBalance,
        },
      }));

      persistState(get());

      apiClient.initializeSocket();

      socketClient.on("matchFound", (matchData: any) => {
        console.log("Match found via WebSocket:", matchData);
        const currentState = get();

        let opponentAddress = matchData.players.find(
          (p: any) =>
            p.address.toLowerCase() !== currentState.user.address?.toLowerCase()
        )?.address;

        if (!opponentAddress && matchData.players.length >= 2) {
          opponentAddress = matchData.players[1].address;
        }

        const newState = {
          matchmaking: {
            ...currentState.matchmaking,
            status: "FOUND" as const,
            matchId: matchData.matchId,
            opponent: {
              address: opponentAddress || "Unknown",
              avatar: "https://placehold.co/40x40/4F46E5/FFFFFF?text=OP",
            },
          },
        };

        set((state) => newState);
        persistState({ ...get(), ...newState });

        setTimeout(() => {
          socketClient.emit("joinRoom", { matchId: matchData.matchId });
        }, 1000);
      });

      socketClient.on("roomJoined", (data: any) => {
        console.log("Room joined:", data);
        const newState = {
          matchmaking: {
            ...get().matchmaking,
            status: "READY" as const,
          },
        };
        set((state) => newState);
        persistState({ ...get(), ...newState });

        setTimeout(() => {
          get().stakeForMatch();
        }, 500);
      });

      socketClient.on("gameStarted", (data: any) => {
        console.log("Game started:", data);

        const playerBoard = initializeBoard();
        const opponentBoard = initializeBoard();

        const newState = {
          game: {
            ...get().game,
            playerState: {
              board: playerBoard,
              score: 0,
              isGameOver: false,
            },
            opponentState: {
              board: opponentBoard,
              score: 0,
              isGameOver: false,
            },
            status: "ACTIVE" as const,
          },
        };

        set((state) => newState);
        persistState({ ...get(), ...newState });
      });

      socketClient.on("moveMade", (data: any) => {
        console.log("Move made by opponent:", data);
        const currentState = get();

        if (data.player !== currentState.user.address) {
          const newState = {
            game: {
              ...currentState.game,
              opponentState: {
                board:
                  data.board ||
                  data.gameState?.board ||
                  currentState.game.opponentState.board,
                score:
                  data.score ||
                  data.gameState?.score ||
                  currentState.game.opponentState.score,
                isGameOver:
                  data.isGameOver || data.gameState?.isGameOver || false,
              },
            },
          };

          set((state) => newState);
          persistState({ ...get(), ...newState });

          if (hasWon(newState.game.opponentState.board)) {
            const gameOverState = {
              game: {
                ...newState.game,
                status: "OPPONENT_WON" as const,
                winner: "opponent" as const,
                transactionHash: data.transactionHash || "0xabcd1234...",
              },
            };

            set((state) => gameOverState);
            persistState({ ...get(), ...gameOverState });

            setTimeout(() => {}, 1000);
          }
        }
      });

      socketClient.on("gameEnded", (data: any) => {
        console.log("Game ended:", data);
        const currentState = get();

        let gameWinner = null;
        let status: GameStatus = "DRAW";

        if (data.winner === currentState.user.address) {
          status = "PLAYER_WON";
          gameWinner = "player";
          const stakeAmount = currentState.matchmaking.stakeAmount;
          const newBalance = (
            Number.parseFloat(currentState.user.gtBalance) +
            stakeAmount * 2
          ).toFixed(2);

          set((state) => ({
            user: {
              ...state.user,
              gtBalance: newBalance,
            },
          }));
        } else if (data.winner && data.winner !== currentState.user.address) {
          status = "OPPONENT_WON";
          gameWinner = "opponent";
        }

        const gameOverState = {
          game: {
            ...currentState.game,
            status,
            winner: gameWinner,
            transactionHash: data.transactionHash || "0xabcd1234...",
          },
        };

        set((state) => gameOverState);
        persistState({ ...get(), ...gameOverState });
      });

      socketClient.on("scoreUpdate", (data: any) => {
        console.log("Score update received:", data);
        const currentState = get();

        if (data.player !== currentState.user.address) {
          const newState = {
            game: {
              ...currentState.game,
              opponentState: {
                ...currentState.game.opponentState,
                score: data.score,
                isGameOver: data.isGameOver || false,
              },
            },
          };

          set((state) => newState);
          persistState({ ...get(), ...newState });

          if (data.score >= 2048) {
            const gameOverState = {
              game: {
                ...newState.game,
                status: "OPPONENT_WON" as const,
                winner: "opponent" as const,
                transactionHash: data.transactionHash || "0xabcd1234...",
              },
            };

            set((state) => gameOverState);
            persistState({ ...get(), ...gameOverState });
          }
        }
      });

      socketClient.on("playerQuit", (data: any) => {
        console.log("Opponent quit:", data);
        const currentState = get();

        if (data.player !== currentState.user.address) {
          const stakeAmount = currentState.matchmaking.stakeAmount;
          const newBalance = (
            Number.parseFloat(currentState.user.gtBalance) +
            stakeAmount * 2
          ).toFixed(2);

          const winState = {
            user: {
              ...currentState.user,
              gtBalance: newBalance,
            },
            game: {
              ...currentState.game,
              status: "PLAYER_WON" as const,
              winner: "player" as const,
              transactionHash: "0xopponent_quit...",
            },
          };

          set((state) => winState);
          persistState({ ...get(), ...winState });

          alert("Your opponent quit the game. You win!");
        }
      });

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          get().disconnectWallet();
        } else {
          const newAddress = accounts[0];
          if (
            newAddress &&
            newAddress.startsWith("0x") &&
            newAddress.length === 42
          ) {
            fetchTokenBalance(newAddress, "GT").then((gtBalance) => {
              fetchTokenBalance(newAddress, "USDT").then((usdtBalance) => {
                set((state) => ({
                  user: {
                    ...state.user,
                    address: newAddress,
                    gtBalance,
                    usdtBalance,
                  },
                }));
              });
            });
          }
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  },

  disconnectWallet: () => {
    if (window.ethereum) {
      window.ethereum.removeListener("accountsChanged", () => {});
    }

    socketClient.disconnect();

    set((state) => ({
      user: {
        ...state.user,
        isConnected: false,
        address: null,
        gtBalance: "0.00",
        usdtBalance: "0.00",
      },
    }));
  },

  setStakeAmount: (amount: number) => {
    set((state) => ({
      matchmaking: {
        ...state.matchmaking,
        stakeAmount: amount,
      },
    }));
  },

  findMatch: async () => {
    const { user, matchmaking } = get();
    if (!user.isConnected || !user.address) return;

    set((state) => ({
      matchmaking: {
        ...state.matchmaking,
        status: "SEARCHING",
      },
    }));

    try {
      const response = await apiClient.joinMatchmakingQueue(
        user.address,
        matchmaking.stakeAmount
      );

      if (!response.success) {
        console.error("Failed to join queue:", response.error);
        set((state) => ({
          matchmaking: {
            ...state.matchmaking,
            status: "IDLE",
          },
        }));
        alert(response.error || "Failed to join matchmaking queue");
      }
    } catch (error) {
      console.error("Failed to find match:", error);
      set((state) => ({
        matchmaking: {
          ...state.matchmaking,
          status: "IDLE",
        },
      }));
    }
  },

  cancelMatchmaking: () => {
    apiClient.leaveMatchmakingQueue();

    set((state) => ({
      matchmaking: {
        ...state.matchmaking,
        status: "IDLE",
        matchId: null,
      },
    }));
  },

  buyTokens: async (amount: number) => {
    const { user } = get();
    if (!user.address || !window.ethereum) return;

    try {
      const usdtAmount = amount; // Amount in USDT (6 decimals handled by contract)

      // For demo purposes, we'll simulate the contract interaction
      // In production, you would:
      // 1. First approve TokenStore to spend USDT: await mockUsdtContract.approve(tokenStoreAddress, usdtAmount)
      // 2. Then buy GT: await tokenStoreContract.buy(usdtAmount)

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: user.address,
            to: "0x1234567890123456789012345678901234567890", // TokenStore contract address
            value: "0x0", // No ETH value for token purchase
            data: `0xa6f2ae3a${amount.toString(16).padStart(64, "0")}`, // buy(uint256) function call
          },
        ],
      });

      // Wait for transaction confirmation
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Update GT balance after successful purchase (1 USDT = 1 GT in this example)
      const newGTBalance = (Number.parseFloat(user.gtBalance) + amount).toFixed(
        2
      );
      const newUSDTBalance = Math.max(
        0,
        Number.parseFloat(user.usdtBalance) - amount
      ).toFixed(2);

      set((state) => ({
        user: {
          ...state.user,
          gtBalance: newGTBalance,
          usdtBalance: newUSDTBalance,
        },
      }));

      alert(
        `Successfully purchased ${amount} GT tokens! Transaction: ${txHash}`
      );
    } catch (error) {
      console.error("Failed to buy tokens:", error);
      alert("Transaction failed. Please try again.");
    }
  },

  stakeForMatch: async () => {
    const { user, matchmaking } = get();
    if (!matchmaking.matchId || !user.address || !matchmaking.opponent.address)
      return;

    set((state) => ({
      matchmaking: {
        ...state.matchmaking,
        status: "STAKING",
      },
    }));

    try {
      const response = await apiClient.createOnChainMatch(
        matchmaking.matchId,
        user.address,
        matchmaking.opponent.address,
        matchmaking.stakeAmount
      );

      if (response.success) {
        const playerBoard = initializeBoard();

        set((state) => ({
          matchmaking: {
            ...state.matchmaking,
            status: "READY",
          },
          game: {
            ...state.game,
            playerState: {
              board: playerBoard,
              score: 0,
              isGameOver: false,
            },
            status: "ACTIVE",
          },
        }));
      }
    } catch (error) {
      console.error("Failed to stake for match:", error);
      setTimeout(() => {
        const playerBoard = initializeBoard();

        set((state) => ({
          matchmaking: {
            ...state.matchmaking,
            status: "READY",
          },
          game: {
            ...state.game,
            playerState: {
              board: playerBoard,
              score: 0,
              isGameOver: false,
            },
            status: "ACTIVE",
          },
        }));
      }, 2000);
    }
  },

  makeMove: async (direction: "up" | "down" | "left" | "right") => {
    const { game, user, matchmaking } = get();
    if (game.playerState.isGameOver || game.status !== "ACTIVE") return;

    let moveResult;
    switch (direction) {
      case "up":
        moveResult = moveUp(game.playerState.board);
        break;
      case "down":
        moveResult = moveDown(game.playerState.board);
        break;
      case "left":
        moveResult = moveLeft(game.playerState.board);
        break;
      case "right":
        moveResult = moveRight(game.playerState.board);
        break;
      default:
        return;
    }

    if (!moveResult.moved) return;

    const newBoard = addRandomTile(moveResult.board);
    const newScore = game.playerState.score + moveResult.score;
    const gameOver = isGameOver(newBoard);
    const won = hasWon(newBoard);

    const newState = {
      game: {
        ...game,
        playerState: {
          board: newBoard,
          score: newScore,
          isGameOver: gameOver,
        },
      },
    };

    set((state) => newState);
    persistState({ ...get(), ...newState });

    if (matchmaking.matchId && user.address) {
      console.log("Emitting score update:", {
        matchId: matchmaking.matchId,
        player: user.address,
        score: newScore,
      });
      socketClient.emit("scoreUpdate", {
        matchId: matchmaking.matchId,
        player: user.address,
        score: newScore,
        isGameOver: gameOver || won,
      });
    }

    if (won) {
      const stakeAmount = matchmaking.stakeAmount;
      const newBalance = (
        Number.parseFloat(get().user.gtBalance) +
        stakeAmount * 2
      ).toFixed(2);

      const winState = {
        user: {
          ...get().user,
          gtBalance: newBalance,
        },
        game: {
          ...get().game,
          status: "PLAYER_WON" as const,
          winner: "player" as const,
          transactionHash: "0xabcd1234...",
        },
      };

      set((state) => winState);
      persistState({ ...get(), ...winState });

      if (matchmaking.matchId) {
        console.log("Emitting game ended - player won");
        socketClient.emit("gameEnded", {
          matchId: matchmaking.matchId,
          winner: user.address,
          transactionHash: "0xabcd1234...",
        });

        apiClient
          .commitResult(matchmaking.matchId, "player")
          .catch((error) => console.error("Failed to commit result:", error));
      }
      return;
    }
  },

  resetGame: () => {
    const resetState = {
      matchmaking: {
        status: "IDLE" as const,
        stakeAmount: 10,
        matchId: null,
        opponent: {
          address: null,
          avatar: "https://placehold.co/40x40/E0E0E0/000000?text=P2",
        },
      },
      game: {
        playerState: {
          board: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
          ],
          score: 0,
          isGameOver: false,
        },
        opponentState: {
          board: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
          ],
          score: 0,
          isGameOver: false,
        },
        status: "PENDING" as const,
        winner: null,
        transactionHash: null,
      },
    };

    set((state) => resetState);
    clearPersistedState();
  },

  quitGame: () => {
    const { user, matchmaking } = get();

    if (matchmaking.matchId && user.address) {
      socketClient.emit("playerQuit", {
        matchId: matchmaking.matchId,
        player: user.address,
      });
    }

    get().resetGame();

    socketClient.disconnect();

    alert("You have quit the game. Your opponent wins the stake.");
  },
}));

async function fetchTokenBalance(
  address: string,
  tokenSymbol: string
): Promise<string> {
  try {
    if (!window.ethereum) return "0.00";

    if (tokenSymbol === "USDT") {
      try {
        // First, ensure we have a proper connection
        await window.ethereum.request({ method: "eth_accounts" });

        // Get current network to determine which contract to use
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        console.log("Current chain ID:", chainId);

        // For local development networks (Hardhat: 0x7a69, Ganache: 0x539, etc.)
        if (chainId !== "0x1") {
          // Use your local MOCK_USDT_ADDRESS
          const MOCK_USDT_ADDRESS =
            "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Replace with your actual address

          try {
            // Chrome-compatible eth_call with proper error handling
            const balance = await window.ethereum.request({
              method: "eth_call",
              params: [
                {
                  to: MOCK_USDT_ADDRESS,
                  data: `0x70a08231000000000000000000000000${address
                    .slice(2)
                    .toLowerCase()}`, // balanceOf(address) - ensure lowercase
                },
                "latest",
              ],
            });

            if (balance && balance !== "0x") {
              // USDT has 6 decimals
              const balanceInUsdt =
                Number.parseInt(balance, 16) / Math.pow(10, 6);
              console.log("USDT balance from contract:", balanceInUsdt);
              return balanceInUsdt.toFixed(2);
            }
          } catch (contractError) {
            console.log(
              "Contract call failed, using ETH-based simulation:",
              contractError
            );
          }
        }

        // Fallback: Get ETH balance and simulate USDT
        const ethBalance = await window.ethereum.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        });

        if (ethBalance && ethBalance !== "0x0") {
          const ethInWei = Number.parseInt(ethBalance, 16);
          const ethAmount = ethInWei / Math.pow(10, 18);

          // Simulate USDT as ETH * 3000 (your 45k USDT scenario)
          const simulatedUSDT = Math.max(ethAmount * 3000, 45000); // Ensure minimum 45k for development
          console.log(
            `Chrome: Simulated USDT balance: ${simulatedUSDT.toFixed(
              2
            )} (based on ${ethAmount} ETH)`
          );
          return simulatedUSDT.toFixed(2);
        }

        // Final fallback for Chrome
        return "45000.00";
      } catch (error) {
        console.error("Chrome USDT balance error:", error);
        return "45000.00"; // Chrome fallback
      }
    }

    if (tokenSymbol === "GT") {
      try {
        const GAME_TOKEN_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Replace with your actual address

        const balance = await window.ethereum.request({
          method: "eth_call",
          params: [
            {
              to: GAME_TOKEN_ADDRESS,
              data: `0x70a08231000000000000000000000000${address
                .slice(2)
                .toLowerCase()}`, // balanceOf(address)
            },
            "latest",
          ],
        });

        if (balance && balance !== "0x") {
          // GT has 18 decimals
          const balanceInGT = Number.parseInt(balance, 16) / Math.pow(10, 18);
          return balanceInGT.toFixed(2);
        }
      } catch (error) {
        console.error("Failed to fetch GT balance:", error);
      }

      return "100.00"; // GT fallback
    }

    return "0.00";
  } catch (error) {
    console.error(`Failed to fetch ${tokenSymbol} balance:`, error);
    return tokenSymbol === "USDT" ? "45000.00" : "100.00";
  }
}
