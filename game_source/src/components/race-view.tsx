"use client"

import { useEffect } from "react"
import { useGameStore } from "@/lib/store"
import { GameGrid2048 } from "./game-grid-2048"
import { RaceStatusPanel } from "./race-status-panel"
import { Button } from "@/components/ui/button"

export function RaceView() {
  const { game, makeMove, quitGame } = useGameStore()

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (game.status !== "ACTIVE" || game.playerState.isGameOver) return

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault()
          makeMove("up")
          break
        case "ArrowDown":
          event.preventDefault()
          makeMove("down")
          break
        case "ArrowLeft":
          event.preventDefault()
          makeMove("left")
          break
        case "ArrowRight":
          event.preventDefault()
          makeMove("right")
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [game.status, game.playerState.isGameOver, makeMove])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <RaceStatusPanel />

      <div className="flex justify-center mb-6">
        <Button onClick={quitGame} variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
          Quit Game
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Player Board */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Your Board</h3>
            <p className="text-sm text-gray-400">Use arrow keys to move tiles</p>
          </div>
          <GameGrid2048 board={game.playerState.board} isInteractive={true} className="mx-auto" />
          {game.playerState.isGameOver && <div className="text-center text-red-400 font-semibold">Game Over!</div>}
        </div>

        {/* Opponent Board */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Opponent's Progress</h3>
            <p className="text-sm text-gray-400">Live score updates</p>
          </div>

          <div className="w-64 h-64 mx-auto bg-gray-900 rounded-lg flex flex-col items-center justify-center space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">{game.opponentState?.score || 0}</div>
              <div className="text-sm text-gray-400">Score</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-gray-300">
                {game.opponentState?.isGameOver ? "Game Over" : "Playing..."}
              </div>
            </div>

            {/* Progress indicator */}
            <div className="w-32 bg-gray-700 rounded-full h-2">
              <div
                className="bg-red-400 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(((game.opponentState?.score || 0) / 2048) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="text-xs text-gray-500">Progress to 2048</div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Race to reach the 2048 tile first to win the entire stake!</p>
      </div>
    </div>
  )
}
