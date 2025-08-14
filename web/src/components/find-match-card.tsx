"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { useGameStore } from "@/lib/store"
import { Loader2, Search, X } from "lucide-react"

export function FindMatchCard() {
  const { user, matchmaking, setStakeAmount, findMatch, cancelMatchmaking } = useGameStore()
  const [localStake, setLocalStake] = useState([matchmaking.stakeAmount])

  const handleStakeChange = (value: number[]) => {
    setLocalStake(value)
    setStakeAmount(value[0])
  }

  const isSearching = matchmaking.status === "SEARCHING"

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Find a Match</CardTitle>
        <CardDescription>Set your stake amount and find an opponent</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSearching ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stake Amount</label>
                <div className="px-3">
                  <Slider
                    value={localStake}
                    onValueChange={handleStakeChange}
                    max={100}
                    min={10}
                    step={10}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10 GT</span>
                  <span className="font-mono">{localStake[0]} GT</span>
                  <span>100 GT</span>
                </div>
              </div>
            </div>

            <Button onClick={findMatch} disabled={!user.isConnected} className="w-full" size="lg">
              <Search className="w-4 h-4 mr-2" />
              Find Match
            </Button>

            {!user.isConnected && (
              <p className="text-sm text-muted-foreground text-center">Connect your wallet to start playing</p>
            )}
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Searching for opponent...</span>
            </div>
            <p className="text-sm text-muted-foreground">Stake: {matchmaking.stakeAmount} GT</p>
            <Button onClick={cancelMatchmaking} variant="outline" className="w-full bg-transparent">
              <X className="w-4 h-4 mr-2" />
              Cancel Search
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
