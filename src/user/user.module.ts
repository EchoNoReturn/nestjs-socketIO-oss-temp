import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { IdModule } from '../infrastructure/id/id.module';

import { User } from './entities/user.entity';
import { UserThirdPartyLogin } from './entities/user-third-party-login.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserThirdPartyController } from './user-third-party.controller';
import { UserThirdPartyService } from './user-third-party.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserThirdPartyLogin]),
    AuthModule,
    IdModule,
  ],
  controllers: [UserController, UserThirdPartyController],
  providers: [UserService, UserThirdPartyService],
  exports: [UserService, UserThirdPartyService],
})
export class UserModule {}
