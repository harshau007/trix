import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

interface MatchFoundData {
  matchId: string;
  players: Array<{ address: string }>;
  stake: number;
}

interface JoinQueueData {
  address: string;
  stake: number;
}

interface RoomJoinedData {
  matchId: string;
  players: string[];
}

interface GameStartedData {
  matchId: string;
  currentPlayer?: string;
  firstPlayer?: string;
}

interface MoveMadeData {
  matchId: string;
  player: string;
  board: (number | null)[][];
  score: number;
  direction: string;
  gameState: {
    board: (number | null)[][];
    score: number;
    isGameOver: boolean;
  };
}

interface GameEndedData {
  matchId: string;
  winner?: string;
  result: string;
  transactionHash?: string;
}

interface PlayerQuitData {
  matchId: string;
  player: string;
  winner: string;
}

interface ScoreUpdateData {
  matchId: string;
  player: string;
  score: number;
  isGameOver: boolean;
}

class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(url = "ws://localhost:3001") {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(url, {
      transports: ["websocket"],
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log("Connected to matchmaking server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from matchmaking server");
    });

    this.socket.on("matchFound", (data: MatchFoundData) => {
      console.log("Match found:", data);
      this.emitToListeners("matchFound", data);
    });

    this.socket.on("roomJoined", (data: RoomJoinedData) => {
      console.log("Room joined:", data);
      this.emitToListeners("roomJoined", data);
    });

    this.socket.on("gameStarted", (data: GameStartedData) => {
      console.log("Game started:", data);
      this.emitToListeners("gameStarted", data);
    });

    this.socket.on("moveMade", (data: MoveMadeData) => {
      console.log("Move made:", data);
      this.emitToListeners("moveMade", data);
    });

    this.socket.on("scoreUpdate", (data: ScoreUpdateData) => {
      console.log("Score update received:", data);
      this.emitToListeners("scoreUpdate", data);
    });

    this.socket.on("gameEnded", (data: GameEndedData) => {
      console.log("Game ended:", data);
      this.emitToListeners("gameEnded", data);
    });

    this.socket.on("playerQuit", (data: PlayerQuitData) => {
      console.log("Player quit:", data);
      this.emitToListeners("playerQuit", data);
    });

    this.socket.on("error", (error: any) => {
      console.error("Socket error:", error);
      this.emitToListeners("error", error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinQueue(address: string, stake: number) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    console.log(`Joining queue with address: ${address}, stake: ${stake}`);
    const queueData: JoinQueueData = { address, stake };
    this.socket.emit("joinQueue", queueData);
  }

  leaveQueue() {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    this.socket.emit("leaveQueue");
  }

  joinRoom(matchId: string) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    console.log(`Joining room: ${matchId}`);
    this.socket.emit("joinRoom", { matchId });
  }

  makeMove(
    matchId: string,
    player: string,
    board: (number | null)[][],
    score: number,
    direction: string
  ) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    console.log(
      `Making 2048 move: ${matchId}, player: ${player}, direction: ${direction}`
    );
    this.socket.emit("makeMove", {
      matchId,
      player,
      board,
      score,
      direction,
      gameState: {
        board,
        score,
        isGameOver: false,
      },
    });
  }

  emitGameEnded(matchId: string, winner: string, transactionHash?: string) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    console.log(`Game ended: ${matchId}, winner: ${winner}`);
    this.socket.emit("gameEnded", { matchId, winner, transactionHash });
  }

  emitPlayerQuit(matchId: string, player: string) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    console.log(`Player quit: ${matchId}, player: ${player}`);
    this.socket.emit("playerQuit", { matchId, player });
  }

  emitScoreUpdate(
    matchId: string,
    player: string,
    score: number,
    isGameOver: boolean
  ) {
    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    console.log(
      `Emitting score update: ${matchId}, player: ${player}, score: ${score}`
    );
    this.socket.emit("scoreUpdate", { matchId, player, score, isGameOver });
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  private emitToListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketClient = new SocketClient();
