"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGameStore } from "@/lib/store";
import { Coins, Wallet } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { user, connectWallet, disconnectWallet, buyTokens } = useGameStore();
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [usdtAmount, setUsdtAmount] = useState("");
  const [error, setError] = useState("");

  const handleBuyGT = () => {
    const amount = Number(usdtAmount);
    if (!usdtAmount || isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount!");
      return;
    }

    if (amount > Number(user.usdtBalance)) {
      setError("Insufficient USDT balance!");
      return;
    }

    buyTokens(amount);
    setShowBuyDialog(false);
    setUsdtAmount("");
    setError("");
  };

  const handleDialogChange = (open: boolean) => {
    setShowBuyDialog(open);
    if (!open) {
      setUsdtAmount("");
      setError("");
    }
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                2048
              </span>
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
                <Dialog open={showBuyDialog} onOpenChange={handleDialogChange}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1 bg-transparent"
                    >
                      <Coins className="w-4 h-4" />
                      <span>Buy GT</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Buy GT Tokens</DialogTitle>
                      <DialogDescription>
                        Enter the amount of USDT you want to spend to buy GT
                        tokens (1:1 ratio)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="usdt-amount">USDT Amount</Label>
                        <Input
                          id="usdt-amount"
                          type="number"
                          value={usdtAmount}
                          onChange={(e) => {
                            setUsdtAmount(e.target.value);
                            setError("");
                          }}
                          placeholder="Enter USDT amount"
                          min="1"
                          max={user.usdtBalance}
                          className="font-mono"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Available: {user.usdtBalance} USDT</span>
                          <span>You'll get: {usdtAmount || "0"} GT</span>
                        </div>
                        {error && (
                          <p className="text-sm text-red-500">{error}</p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleBuyGT}
                        disabled={
                          !usdtAmount ||
                          Number(usdtAmount) <= 0 ||
                          Number(usdtAmount) > Number(user.usdtBalance)
                        }
                        className="w-full"
                      >
                        Buy GT Tokens
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Button
                onClick={user.isConnected ? disconnectWallet : connectWallet}
                className="flex items-center space-x-1"
              >
                <Wallet className="w-4 h-4" />
                <span>
                  {user.isConnected ? "Disconnect" : "Connect Wallet"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
