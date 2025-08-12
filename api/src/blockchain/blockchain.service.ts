import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, ethers, JsonRpcProvider, Wallet } from 'ethers';

// Import ABIs from the contracts project
// Make sure the path is correct relative to the 'api' directory
import * as GameToken from '../../../contracts/artifacts/contracts/GameToken.sol/GameToken.json';
import * as PlayGame from '../../../contracts/artifacts/contracts/PlayGame.sol/PlayGame.json';
import * as TokenStore from '../../../contracts/artifacts/contracts/TokenStore.sol/TokenStore.json';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: JsonRpcProvider;
  private operator: Wallet;

  private gameTokenContract: Contract;
  private tokenStoreContract: Contract;
  private playGameContract: Contract;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // 1. Fetch values from ConfigService
    const rpcUrl = this.configService.get<string>('RPC_URL');
    const privateKey = this.configService.get<string>('OPERATOR_PRIVATE_KEY');
    const gameTokenAddress =
      this.configService.get<string>('GAME_TOKEN_ADDRESS');
    const tokenStoreAddress = this.configService.get<string>(
      'TOKEN_STORE_ADDRESS',
    );
    const playGameAddress = this.configService.get<string>('PLAY_GAME_ADDRESS');

    // 2. Add validation checks to ensure they exist
    if (
      !rpcUrl ||
      !privateKey ||
      !gameTokenAddress ||
      !tokenStoreAddress ||
      !playGameAddress
    ) {
      throw new Error(
        'One or more required environment variables are not set in .env file.',
      );
    }

    // 3. If checks pass, TypeScript knows these are now strings, not undefined
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.operator = new ethers.Wallet(privateKey, this.provider);

    this.logger.log(`Operator address: ${this.operator.address}`);

    this.gameTokenContract = new ethers.Contract(
      gameTokenAddress,
      GameToken.abi,
      this.operator,
    );
    this.tokenStoreContract = new ethers.Contract(
      tokenStoreAddress,
      TokenStore.abi,
      this.operator,
    );
    this.playGameContract = new ethers.Contract(
      playGameAddress,
      PlayGame.abi,
      this.operator,
    );

    this.logger.log('Blockchain service initialized and contracts connected.');
  }

  getOperatorAddress(): string {
    return this.operator.address;
  }

  // NOTE: The 'buy' function is called by the user directly from the frontend
  // This backend does not need a '/purchase' endpoint as per the contract design.
  // The user calls tokenStore.buy() after approving USDT.

  async createMatch(p1: string, p2: string, stake: string): Promise<string> {
    if (!ethers.isAddress(p1) || !ethers.isAddress(p2)) {
      throw new Error('Invalid player address');
    }
    const stakeAmount = ethers.parseUnits(stake, 18); // GT has 18 decimals

    // Generate a unique matchId based on players and a nonce (timestamp)
    const matchIdString = `${p1}-${p2}-${Date.now()}`;
    const matchId = ethers.keccak256(ethers.toUtf8Bytes(matchIdString));

    this.logger.log(
      `Creating match ${matchId} for ${p1} vs ${p2} with stake ${stake}`,
    );

    const tx = await this.playGameContract.createMatch(
      matchId,
      p1,
      p2,
      stakeAmount,
    );
    await tx.wait();

    this.logger.log(`Match created. Transaction hash: ${tx.hash}`);
    return matchId;
  }

  async commitResult(matchId: string, winner: string): Promise<string> {
    if (!ethers.isAddress(winner)) {
      throw new Error('Invalid winner address');
    }
    this.logger.log(
      `Committing result for match ${matchId}. Winner: ${winner}`,
    );

    const tx = await this.playGameContract.commitResult(matchId, winner);
    await tx.wait();

    this.logger.log(`Result committed. Transaction hash: ${tx.hash}`);
    return tx.hash;
  }
}
