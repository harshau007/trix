"use client"

import { Button } from "@/components/ui/button"
import { useGameStore } from "@/lib/store"
import { Wallet, Coins } from "lucide-react"
import { useState } from "react"

export function Header() {
  const { user, connectWallet, disconnectWallet, buyTokens } = useGameStore()
  const [showBuyDialog, setShowBuyDialog] = useState(false)

  const handleBuyGT = () => {
    const amount = prompt("How much USDT do you want to spend to buy GT tokens?")
    if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
      const usdtAmount = Number(amount)
      if (usdtAmount > Number(user.usdtBalance)) {
        alert("Insufficient USDT balance!")
        return
      }
      buyTokens(usdtAmount)
    } else if (amount !== null) {
      alert("Please enter a valid amount!")
    }
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">2048</span>
            </div>
            <h1 className="text-xl font-bold">2048 Race</h1>
          </div>

          <div className="flex items-center space-x-4">
            {user.isConnected && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">GT:</span>
                  <span className="font-mono">{user.gtBalance}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">USDT:</span>
                  <span className="font-mono">{user.usdtBalance}</span>
                </div>
                <div className="text-muted-foreground">
                  {user.address?.slice(0, 6)}...{user.address?.slice(-4)}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              {user.isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBuyGT}
                  className="flex items-center space-x-1 bg-transparent"
                >
                  <Coins className="w-4 h-4" />
                  <span>Buy GT</span>
                </Button>
              )}

              <Button
                onClick={user.isConnected ? disconnectWallet : connectWallet}
                className="flex items-center space-x-1"
              >
                <Wallet className="w-4 h-4" />
                <span>{user.isConnected ? "Disconnect" : "Connect Wallet"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
