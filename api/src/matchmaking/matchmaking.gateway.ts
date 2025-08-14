import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const matchmakingQueue: Record<number, Socket[]> = {};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MatchmakingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.removeClientFromQueue(client);
  }

  @SubscribeMessage('joinQueue')
  handleJoinQueue(
    client: Socket,
    payload: { address: string; stake: number },
  ): void {
    const { address, stake } = payload;
    
    for (const stakeAmount in matchmakingQueue) {
        const alreadyInQueue = matchmakingQueue[stakeAmount].some(socket => socket.data.address === address);
        if (alreadyInQueue) {
            console.log(`Player ${address} is already in a queue. Ignoring join request.`);
            client.emit('error', { message: 'You are already in the matchmaking queue.' });
            return;
        }
    }

    console.log(
      `Player ${address} (${client.id}) joining queue with stake ${stake}`,
    );

    client.data.address = address;
    client.data.stake = stake;

    if (!matchmakingQueue[stake]) {
      matchmakingQueue[stake] = [];
    }
    matchmakingQueue[stake].push(client);

    this.tryToMatchPlayers(stake);
  }

  @SubscribeMessage('leaveQueue')
  handleLeaveQueue(client: Socket): void {
    const { address } = client.data;
    if (address) {
      console.log(`Player ${address} (${client.id}) leaving queue.`);
      this.removeClientFromQueue(client);
    }
  }

  private removeClientFromQueue(client: Socket) {
    for (const stake in matchmakingQueue) {
      matchmakingQueue[stake] = matchmakingQueue[stake].filter(
        (socket) => socket.id !== client.id,
      );
    }
  }

  private tryToMatchPlayers(stake: number) {
    const queue = matchmakingQueue[stake];

    if (queue && queue.length >= 2) {
      const player1Socket = queue.shift() as Socket;
      const player2Socket = queue.shift() as Socket;

      if (player1Socket.data.address === player2Socket.data.address) {
        console.log("Attempted to match a player with themselves. Re-queuing one player.");
        queue.unshift(player2Socket);
        return; 
      }
      
      console.log(`Found a valid match for stake ${stake}!`);

      const matchId = uuidv4();

      const room = `match-${matchId}`;
      player1Socket.join(room);
      player2Socket.join(room);

      console.log(
        `Created room ${room} for players ${player1Socket.data.address} and ${player2Socket.data.address}`,
      );

      this.server.to(room).emit('matchFound', {
        matchId: matchId,
        players: [
          { socketId: player1Socket.id, address: player1Socket.data.address },
          { socketId: player2Socket.id, address: player2Socket.data.address },
        ],
        stake: stake,
      });
    }
  }
}