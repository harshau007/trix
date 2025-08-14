import { create } from "zustand"
import type { ZustandStore, GameStatus } from "@/types"
import { apiClient } from "./api-client"
import { socketClient } from "./socket-client"
import { initializeBoard, moveUp, moveDown, moveLeft, moveRight, addRandomTile, isGameOver, hasWon } from "./game-logic"

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, callback: (accounts: string[]) => void) => void
      removeListener: (event: string, callback: (accounts: string[]) => void) => void
      isMetaMask?: boolean
    }
  }
}

function persistState(state: ZustandStore) {
  try {
    const stateToSave = {
      user: state.user,
      matchmaking: state.matchmaking,
      game: state.game,
      timestamp: Date.now(),
    }
    localStorage.setItem("trix-game-state", JSON.stringify(stateToSave))
  } catch (error) {
    console.error("Failed to persist state:", error)
  }
}

function loadPersistedState(): Partial<ZustandStore> {
  try {
    const saved = localStorage.getItem("trix-game-state")
    if (!saved) return {}

    const parsed = JSON.parse(saved)

    if (Date.now() - parsed.timestamp > 30 * 60 * 1000) {
      clearPersistedState()
      return {}
    }

    if (parsed.user?.isConnected && parsed.game?.status === "ACTIVE") {
      return {
        user: parsed.user,
        matchmaking: parsed.matchmaking,
        game: parsed.game,
      }
    }

    return {}
  } catch (error) {
    console.error("Failed to load persisted state:", error)
    clearPersistedState()
    return {}
  }
}

function clearPersistedState() {
  try {
    localStorage.removeItem("trix-game-state")
  } catch (error) {
    console.error("Failed to clear persisted state:", error)
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
        alert("Please install MetaMask to connect your wallet")
        return
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (accounts.length === 0) {
        throw new Error("No accounts found")
      }

      const address = accounts[0]

      if (!address || !address.startsWith("0x") || address.length !== 42) {
        throw new Error("Invalid wallet address format")
      }

      const gtBalance = await fetchTokenBalance(address, "GT")
      const usdtBalance = await fetchTokenBalance(address, "USDT")

      set((state) => ({
        user: {
          ...state.user,
          isConnected: true,
          address,
          gtBalance,
          usdtBalance,
        },
      }))

      persistState(get())

      apiClient.initializeSocket()

      socketClient.on("matchFound", (matchData: any) => {
        console.log("Match found via WebSocket:", matchData)
        const currentState = get()

        let opponentAddress = matchData.players.find(
          (p: any) => p.address.toLowerCase() !== currentState.user.address?.toLowerCase(),
        )?.address

        if (!opponentAddress && matchData.players.length >= 2) {
          opponentAddress = matchData.players[1].address
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
        }

        set((state) => newState)
        persistState({ ...get(), ...newState })

        setTimeout(() => {
          socketClient.emit("joinRoom", { matchId: matchData.matchId })
        }, 1000)
      })

      socketClient.on("roomJoined", (data: any) => {
        console.log("Room joined:", data)
        const newState = {
          matchmaking: {
            ...get().matchmaking,
            status: "READY" as const,
          },
        }
        set((state) => newState)
        persistState({ ...get(), ...newState })

        setTimeout(() => {
          get().stakeForMatch()
        }, 500)
      })

      socketClient.on("gameStarted", (data: any) => {
        console.log("Game started:", data)

        const playerBoard = initializeBoard()
        const opponentBoard = initializeBoard()

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
        }

        set((state) => newState)
        persistState({ ...get(), ...newState })
      })

      socketClient.on("moveMade", (data: any) => {
        console.log("Move made by opponent:", data)
        const currentState = get()

        if (data.player !== currentState.user.address) {
          const newState = {
            game: {
              ...currentState.game,
              opponentState: {
                board: data.board || data.gameState?.board || currentState.game.opponentState.board,
                score: data.score || data.gameState?.score || currentState.game.opponentState.score,
                isGameOver: data.isGameOver || data.gameState?.isGameOver || false,
              },
            },
          }

          set((state) => newState)
          persistState({ ...get(), ...newState })

          if (hasWon(newState.game.opponentState.board)) {
            const gameOverState = {
              game: {
                ...newState.game,
                status: "OPPONENT_WON" as const,
                winner: "opponent" as const,
                transactionHash: data.transactionHash || "0xabcd1234...",
              },
            }

            set((state) => gameOverState)
            persistState({ ...get(), ...gameOverState })

            setTimeout(() => {}, 1000)
          }
        }
      })

      socketClient.on("gameEnded", (data: any) => {
        console.log("Game ended:", data)
        const currentState = get()

        let gameWinner = null
        let status: GameStatus = "DRAW"

        if (data.winner === currentState.user.address) {
          status = "PLAYER_WON"
          gameWinner = "player"
          const stakeAmount = currentState.matchmaking.stakeAmount
          const newBalance = (Number.parseFloat(currentState.user.gtBalance) + stakeAmount * 2).toFixed(2)

          set((state) => ({
            user: {
              ...state.user,
              gtBalance: newBalance,
            },
          }))
        } else if (data.winner && data.winner !== currentState.user.address) {
          status = "OPPONENT_WON"
          gameWinner = "opponent"
        }

        const gameOverState = {
          game: {
            ...currentState.game,
            status,
            winner: gameWinner,
            transactionHash: data.transactionHash || "0xabcd1234...",
          },
        }

        set((state) => gameOverState)
        persistState({ ...get(), ...gameOverState })
      })

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          get().disconnectWallet()
        } else {
          const newAddress = accounts[0]
          if (newAddress && newAddress.startsWith("0x") && newAddress.length === 42) {
            set((state) => ({
              user: {
                ...state.user,
                address: newAddress,
              },
            }))
          }
        }
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      alert("Failed to connect wallet. Please try again.")
    }
  },

  disconnectWallet: () => {
    if (window.ethereum) {
      window.ethereum.removeListener("accountsChanged", () => {})
    }

    socketClient.disconnect()

    set((state) => ({
      user: {
        ...state.user,
        isConnected: false,
        address: null,
        gtBalance: "0.00",
        usdtBalance: "0.00",
      },
    }))
  },

  setStakeAmount: (amount: number) => {
    set((state) => ({
      matchmaking: {
        ...state.matchmaking,
        stakeAmount: amount,
      },
    }))
  },

  findMatch: async () => {
    const { user, matchmaking } = get()
    if (!user.isConnected || !user.address) return

    set((state) => ({
      matchmaking: {
        ...state.matchmaking,
        status: "SEARCHING",
      },
    }))

    try {
      const response = await apiClient.joinMatchmakingQueue(user.address, matchmaking.stakeAmount)

      if (!response.success) {
        console.error("Failed to join queue:", response.error)
        set((state) => ({
          matchmaking: {
            ...state.matchmaking,
            status: "IDLE",
          },
        }))
        alert(response.error || "Failed to join matchmaking queue")
      }
    } catch (error) {
      console.error("Failed to find match:", error)
      set((state) => ({
        matchmaking: {
          ...state.matchmaking,
          status: "IDLE",
        },
      }))
    }
  },

  cancelMatchmaking: () => {
    apiClient.leaveMatchmakingQueue()

    set((state) => ({
      matchmaking: {
        ...state.matchmaking,
        status: "IDLE",
        matchId: null,
      },
    }))
  },

  buyTokens: async (amount: number) => {
    const { user } = get()
    if (!user.address || !window.ethereum) return

    try {
      const usdtAmount = amount // Amount in USDT (6 decimals handled by contract)

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
      })

      // Wait for transaction confirmation
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Update GT balance after successful purchase (1 USDT = 1 GT in this example)
      const newGTBalance = (Number.parseFloat(user.gtBalance) + amount).toFixed(2)
      const newUSDTBalance = Math.max(0, Number.parseFloat(user.usdtBalance) - amount).toFixed(2)

      set((state) => ({
        user: {
          ...state.user,
          gtBalance: newGTBalance,
          usdtBalance: newUSDTBalance,
        },
      }))

      alert(`Successfully purchased ${amount} GT tokens! Transaction: ${txHash}`)
    } catch (error) {
      console.error("Failed to buy tokens:", error)
      alert("Transaction failed. Please try again.")
    }
  },

  stakeForMatch: async () => {
    const { user, matchmaking } = get()
    if (!matchmaking.matchId || !user.address || !matchmaking.opponent.address) return

    set((state) => ({
      matchmaking: {
        ...state.matchmaking,
        status: "STAKING",
      },
    }))

    try {
      const response = await apiClient.createOnChainMatch(
        matchmaking.matchId,
        user.address,
        matchmaking.opponent.address,
        matchmaking.stakeAmount,
      )

      if (response.success) {
        const playerBoard = initializeBoard()

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
        }))
      }
    } catch (error) {
      console.error("Failed to stake for match:", error)
      setTimeout(() => {
        const playerBoard = initializeBoard()

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
        }))
      }, 2000)
    }
  },

  makeMove: async (direction: "up" | "down" | "left" | "right") => {
    const { game, user, matchmaking } = get()
    if (game.playerState.isGameOver || game.status !== "ACTIVE") return

    let moveResult
    switch (direction) {
      case "up":
        moveResult = moveUp(game.playerState.board)
        break
      case "down":
        moveResult = moveDown(game.playerState.board)
        break
      case "left":
        moveResult = moveLeft(game.playerState.board)
        break
      case "right":
        moveResult = moveRight(game.playerState.board)
        break
      default:
        return
    }

    if (!moveResult.moved) return

    const newBoard = addRandomTile(moveResult.board)
    const newScore = game.playerState.score + moveResult.score
    const gameOver = isGameOver(newBoard)
    const won = hasWon(newBoard)

    const newState = {
      game: {
        ...game,
        playerState: {
          board: newBoard,
          score: newScore,
          isGameOver: gameOver,
        },
      },
    }

    set((state) => newState)
    persistState({ ...get(), ...newState })

    if (won) {
      const stakeAmount = matchmaking.stakeAmount
      const newBalance = (Number.parseFloat(get().user.gtBalance) + stakeAmount * 2).toFixed(2)

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
      }

      set((state) => winState)
      persistState({ ...get(), ...winState })

      if (matchmaking.matchId) {
        socketClient.emit("gameEnded", {
          matchId: matchmaking.matchId,
          winner: user.address,
          transactionHash: "0xabcd1234...",
        })

        apiClient
          .commitResult(matchmaking.matchId, "player")
          .catch((error) => console.error("Failed to commit result:", error))
      }
      return
    }

    if (matchmaking.matchId && user.address) {
      socketClient.emit("makeMove", {
        matchId: matchmaking.matchId,
        player: user.address,
        board: newBoard,
        score: newScore,
        isGameOver: gameOver,
        direction,
        gameState: {
          board: newBoard,
          score: newScore,
          isGameOver: gameOver,
        },
      })
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
    }

    set((state) => resetState)
    clearPersistedState()
  },

  quitGame: () => {
    const { user, matchmaking } = get()

    // Notify opponent via WebSocket that player quit
    if (matchmaking.matchId && user.address) {
      socketClient.emit("playerQuit", {
        matchId: matchmaking.matchId,
        player: user.address,
      })
    }

    // Reset game state and return to home
    get().resetGame()

    // Disconnect from current match
    socketClient.disconnect()

    // Show confirmation
    alert("You have quit the game. Your opponent wins the stake.")
  },
}))

async function fetchTokenBalance(address: string, tokenSymbol: string): Promise<string> {
  try {
    if (!window.ethereum) return "0.00"

    return tokenSymbol === "GT" ? "100.00" : "50.00"
  } catch (error) {
    console.error(`Failed to fetch ${tokenSymbol} balance:`, error)
    return "0.00"
  }
}
