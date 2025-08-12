// api/src/blockchain/blockchain.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

// --- DTOs (Data Transfer Objects) for request body validation ---
class CreateMatchDto {
  p1: string;
  p2: string;
  stake: string;
}

class CommitResultDto {
  matchId: string;
  winner: string;
}

@Controller('api') // Base path for all endpoints in this controller
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('operator')
  getOperatorAddress() {
    return { operatorAddress: this.blockchainService.getOperatorAddress() };
  }

  @Post('match/start')
  @HttpCode(HttpStatus.CREATED)
  async createMatch(@Body() createMatchDto: CreateMatchDto) {
    const { p1, p2, stake } = createMatchDto;
    const matchId = await this.blockchainService.createMatch(p1, p2, stake);
    return { message: 'Match created successfully', matchId };
  }

  @Post('match/result')
  @HttpCode(HttpStatus.OK)
  async commitResult(@Body() commitResultDto: CommitResultDto) {
    const { matchId, winner } = commitResultDto;
    const txHash = await this.blockchainService.commitResult(matchId, winner);
    return {
      message: 'Result committed successfully',
      transactionHash: txHash,
    };
  }
}
