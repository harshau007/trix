import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { BlockchainModule } from './blockchain/blockchain.module';
import { MatchmakingGateway } from './matchmaking/matchmaking.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BlockchainModule,
  ],
  controllers: [AppController],
  providers: [AppService, MatchmakingGateway],
})
export class AppModule {}
