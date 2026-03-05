import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { initializeInfrastructureModules } from './infrastructure';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { GameGateway } from './game/game.gateway';

@Module({
  imports: [...initializeInfrastructureModules(), UserModule, AuthModule],
  controllers: [AppController],
  providers: [AppService, GameGateway],
})
export class AppModule {}
