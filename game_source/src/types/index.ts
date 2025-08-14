// TypeScript type definitions for the TriX 2048 Race application
export type User = {
  isConnected: boolean
  address: string | null
  gtBalance: string
  usdtBalance: string
}

export type MatchmakingStatus = "IDLE" | "SEARCHING" | "FOUND" | "STAKING" | "READY"

export type Matchmaking = {
  status: MatchmakingStatus
  stakeAmount: number
  matchId: string | null
  opponent: {
    address: string | null
    avatar: string
  }
}

export type GameStatus = "PENDING" | "ACTIVE" | "PLAYER_WON" | "OPPONENT_WON" | "DRAW" | "COMPLETE"

export type GameBoard = (number | null)[][]

export type PlayerGameState = {
  board: GameBoard
  score: number
  isGameOver: boolean
}

export type Game = {
  playerState: PlayerGameState
  opponentState: PlayerGameState
  status: GameStatus
  winner: string | null
  transactionHash: string | null
}

export type ZustandState = {
  user: User
  matchmaking: Matchmaking
  game: Game
}

export type ZustandActions = {
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  setStakeAmount: (amount: number) => void
  findMatch: () => Promise<void>
  cancelMatchmaking: () => void
  buyTokens: (amount: number) => Promise<void>
  stakeForMatch: () => Promise<void>
  makeMove: (direction: "up" | "down" | "left" | "right") => Promise<void>
  resetGame: () => void
  quitGame: () => void
}

export type ZustandStore = ZustandState & ZustandActions

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

export type JoinQueueResponse = {
  matchId: string
  opponentAddress: string
}

export type CreateMatchResponse = {
  matchId: string
}

export type CommitResultResponse = {
  transactionHash: string
}
