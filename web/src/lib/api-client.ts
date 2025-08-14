import type { ApiResponse, JoinQueueResponse, CreateMatchResponse, CommitResultResponse } from "@/types"
import { socketClient } from "./socket-client"

class ApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"

  initializeSocket() {
    return socketClient.connect(this.baseUrl)
  }

  async joinMatchmakingQueue(address: string, stake: number): Promise<ApiResponse<JoinQueueResponse>> {
    try {
      // Ensure socket is connected
      if (!socketClient.isConnected()) {
        this.initializeSocket()
      }

      if (!address || !address.startsWith("0x") || address.length !== 42) {
        return { success: false, error: "Invalid Ethereum address format" }
      }

      // Join queue via WebSocket
      socketClient.joinQueue(address, stake)

      return { success: true, data: { matchId: "pending", opponentAddress: "pending" } }
    } catch (error) {
      console.error("Failed to join queue:", error)
      return { success: false, error: "Failed to join matchmaking queue" }
    }
  }

  leaveMatchmakingQueue(): void {
    try {
      socketClient.leaveQueue()
    } catch (error) {
      console.error("Failed to leave queue:", error)
    }
  }

  async createOnChainMatch(
    matchId: string,
    p1: string,
    p2: string,
    stake: number,
  ): Promise<ApiResponse<CreateMatchResponse>> {
    try {
      if (!p1 || !p1.startsWith("0x") || p1.length !== 42) {
        return { success: false, error: "Invalid player 1 address format" }
      }
      if (!p2 || !p2.startsWith("0x") || p2.length !== 42) {
        return { success: false, error: "Invalid player 2 address format" }
      }

      console.log(`Creating match: ${matchId}, P1: ${p1}, P2: ${p2}, Stake: ${stake}`)

      const response = await fetch(`${this.baseUrl}/api/match/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matchId, p1, p2, stake: stake.toString() }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Match creation failed:", data)
        return { success: false, error: data.message || data.error || "Failed to create on-chain match" }
      }

      return { success: true, data }
    } catch (error) {
      console.error("Network error creating match:", error)
      return { success: false, error: "Network error occurred" }
    }
  }

  async commitResult(matchId: string, winner: string): Promise<ApiResponse<CommitResultResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/match/result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matchId, winner }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || "Failed to commit result" }
      }

      return { success: true, data }
    } catch (error) {
      return { success: false, error: "Network error occurred" }
    }
  }
}

export const apiClient = new ApiClient()
