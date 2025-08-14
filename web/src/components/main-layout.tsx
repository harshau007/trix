"use client"

import { Header } from "./header"
import { FindMatchCard } from "./find-match-card"
import { RaceView } from "./race-view"
import { MatchStatusModal } from "./match-status-modal"
import { GameOverDialog } from "./game-over-dialog"
import { useGameStore } from "@/lib/store"

export function MainLayout() {
  const { matchmaking, game } = useGameStore()

  const showGame =
    matchmaking.status === "READY" ||
    game.status === "ACTIVE" ||
    game.status === "PLAYER_WON" ||
    game.status === "OPPONENT_WON" ||
    game.status === "DRAW"

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {!showGame ? (
          <div className="flex justify-center">
            <FindMatchCard />
          </div>
        ) : (
          <RaceView />
        )}
      </main>

      <MatchStatusModal />
      <GameOverDialog />
    </div>
  )
}
