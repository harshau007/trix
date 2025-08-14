"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useGameStore } from "@/lib/store"
import { Trophy, Frown, Minus, ExternalLink } from "lucide-react"

export function GameOverDialog() {
  const { game, matchmaking, resetGame } = useGameStore()

  const isOpen =
    game.status === "PLAYER_WON" ||
    game.status === "OPPONENT_WON" ||
    game.status === "DRAW" ||
    game.playerState.isGameOver ||
    game.opponentState?.isGameOver

  const playerHas2048 = game.playerState.board.some((row) => row.some((cell) => cell === 2048))
  const opponentHas2048 = game.opponentState?.board?.some((row) => row.some((cell) => cell === 2048)) || false

  const getResultContent = () => {
    if (game.status === "PLAYER_WON" || (playerHas2048 && !opponentHas2048)) {
      return {
        title: "You Won the Race!",
        description: `Congratulations! You reached 2048 first and won ${matchmaking.stakeAmount * 2} GT`,
        icon: <Trophy className="w-12 h-12 text-yellow-500" />,
        bgColor: "bg-green-50 dark:bg-green-950",
      }
    }

    if (game.status === "OPPONENT_WON" || (opponentHas2048 && !playerHas2048)) {
      return {
        title: "Opponent Won the Race",
        description: `Your opponent reached 2048 first! You lost ${matchmaking.stakeAmount} GT`,
        icon: <Frown className="w-12 h-12 text-red-500" />,
        bgColor: "bg-red-50 dark:bg-red-950",
      }
    }

    if (
      game.status === "DRAW" ||
      (game.playerState.isGameOver && game.opponentState?.isGameOver && !playerHas2048 && !opponentHas2048)
    ) {
      return {
        title: "It's a Draw!",
        description: "Both players got stuck without reaching 2048. Your stake has been returned.",
        icon: <Minus className="w-12 h-12 text-gray-500" />,
        bgColor: "bg-gray-50 dark:bg-gray-950",
      }
    }

    return null
  }

  const content = getResultContent()
  if (!content) return null

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">{content.icon}</div>
          <DialogTitle className="text-2xl">{content.title}</DialogTitle>
          <DialogDescription className="text-base">{content.description}</DialogDescription>
        </DialogHeader>

        {game.transactionHash && (
          <div className="py-4">
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => window.open(`https://etherscan.io/tx/${game.transactionHash}`, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Transaction
            </Button>
          </div>
        )}

        <div className="pt-4">
          <Button onClick={resetGame} className="w-full" size="lg">
            Race Again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
