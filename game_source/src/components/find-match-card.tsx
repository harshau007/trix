"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGameStore } from "@/lib/store";
import { Loader2, Search, X } from "lucide-react";
import { useState } from "react";

export function FindMatchCard() {
  const { user, matchmaking, setStakeAmount, findMatch, cancelMatchmaking } =
    useGameStore();
  const [stakeInput, setStakeInput] = useState(
    matchmaking.stakeAmount.toString()
  );
  const [error, setError] = useState("");

  const handleStakeChange = (value: string) => {
    setStakeInput(value);
    setError("");

    const numValue = Number(value);
    if (value && !isNaN(numValue) && numValue > 0) {
      if (numValue > Number(user.gtBalance)) {
        setError(`Insufficient GT balance. You have ${user.gtBalance} GT`);
      } else {
        setStakeAmount(numValue);
      }
    }
  };

  const canFindMatch = () => {
    const numValue = Number(stakeInput);
    return (
      user.isConnected &&
      !isNaN(numValue) &&
      numValue > 0 &&
      numValue <= Number(user.gtBalance) &&
      !error
    );
  };

  const isSearching = matchmaking.status === "SEARCHING";

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Find a Match</CardTitle>
        <CardDescription>
          Set your stake amount and find an opponent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSearching ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stake Amount (GT)</label>
                <Input
                  type="number"
                  value={stakeInput}
                  onChange={(e) => handleStakeChange(e.target.value)}
                  placeholder="Enter stake amount"
                  min="1"
                  max={user.gtBalance}
                  className="text-center font-mono"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Available: {user.gtBalance} GT</span>
                  {error && <span className="text-red-500">{error}</span>}
                </div>
              </div>
            </div>

            <Button
              onClick={findMatch}
              disabled={!canFindMatch()}
              className="w-full"
              size="lg"
            >
              <Search className="w-4 h-4 mr-2" />
              Find Match
            </Button>

            {!user.isConnected && (
              <p className="text-sm text-muted-foreground text-center">
                Connect your wallet to start playing
              </p>
            )}

            {user.isConnected && Number(user.gtBalance) === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                You need GT tokens to play. Buy some GT first!
              </p>
            )}
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Searching for opponent...</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Stake: {matchmaking.stakeAmount} GT
            </p>
            <Button
              onClick={cancelMatchmaking}
              variant="outline"
              className="w-full bg-transparent"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Search
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
