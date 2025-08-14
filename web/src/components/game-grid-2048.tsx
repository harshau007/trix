import type { GameBoard } from "@/types"
import { getTileColor } from "@/lib/game-logic"

interface GameGrid2048Props {
  board: GameBoard
  isInteractive?: boolean
  className?: string
}

export function GameGrid2048({ board, isInteractive = false, className = "" }: GameGrid2048Props) {
  if (!board || !Array.isArray(board) || board.length !== 4) {
    return (
      <div className={`w-64 h-64 bg-gray-900 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-gray-500">Loading board...</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-4 gap-2 p-4 bg-gray-900 rounded-lg ${className}`}>
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={`
              w-16 h-16 rounded-md flex items-center justify-center text-lg font-bold
              transition-all duration-200 ease-in-out
              ${getTileColor(cell)}
              ${isInteractive ? "cursor-pointer" : ""}
            `}
          >
            {cell || ""}
          </div>
        )),
      )}
    </div>
  )
}
