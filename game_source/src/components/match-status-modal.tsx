"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useGameStore } from "@/lib/store"
import { Loader2, Users, Coins } from "lucide-react"

export function MatchStatusModal() {
  const { matchmaking, stakeForMatch } = useGameStore()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(matchmaking.status === "FOUND" || matchmaking.status === "STAKING")
  }, [matchmaking.status])

  const getModalContent = () => {
    switch (matchmaking.status) {
      case "FOUND":
        return {
          title: "Opponent Found!",
          description: `Ready to stake ${matchmaking.stakeAmount} GT and start the game?`,
          icon: <Users className="w-8 h-8 text-primary" />,
          action: (
            <Button onClick={stakeForMatch} className="w-full">
              <Coins className="w-4 h-4 mr-2" />
              Stake {matchmaking.stakeAmount} GT
            </Button>
          ),
        }
      case "STAKING":
        return {
          title: "Staking in Progress",
          description: "Creating match on blockchain...",
          icon: <Loader2 className="w-8 h-8 animate-spin text-primary" />,
          action: null,
        }
      default:
        return null
    }
  }

  const content = getModalContent()
  if (!content) return null

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">{content.icon}</div>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>

        {matchmaking.opponent.address && (
          <div className="flex items-center justify-center space-x-2 py-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-medium">OP</span>
            </div>
            <span className="text-sm text-muted-foreground">{matchmaking.opponent.address}</span>
          </div>
        )}

        {content.action && <div className="pt-4">{content.action}</div>}
      </DialogContent>
    </Dialog>
  )
}
