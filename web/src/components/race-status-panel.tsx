import { useGameStore } from "@/lib/store"

export function RaceStatusPanel() {
  const { game, matchmaking, user } = useGameStore()

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">Your Score</div>
          <div className="text-2xl font-bold text-blue-400">{game.playerState.score.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">
            {user.address ? `${user.address.slice(0, 6)}...${user.address.slice(-4)}` : "You"}
          </div>
        </div>

        <div className="text-center px-8">
          <div className="text-sm text-gray-400 mb-1">Total Stake</div>
          <div className="text-xl font-bold text-yellow-400">{(matchmaking.stakeAmount * 2).toLocaleString()} GT</div>
          <div className="text-xs text-gray-500 mt-1">Winner takes all</div>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">Opponent Score</div>
          <div className="text-2xl font-bold text-red-400">{game.opponentState.score.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">
            {matchmaking.opponent.address
              ? `${matchmaking.opponent.address.slice(0, 6)}...${matchmaking.opponent.address.slice(-4)}`
              : "Opponent"}
          </div>
        </div>
      </div>

      {game.status === "ACTIVE" && (
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-400">
            First to reach <span className="text-yellow-400 font-bold">2048</span> wins!
          </div>
        </div>
      )}
    </div>
  )
}
