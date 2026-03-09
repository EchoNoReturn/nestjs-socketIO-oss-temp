import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { IdModule } from '../infrastructure/id/id.module';

import { User } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserThirdPartyLogin } from './third-party/entities/user-third-party-login.entity';
import { UserThirdPartyController } from './third-party/user-third-party.controller';
import { UserThirdPartyService } from './third-party/user-third-party.service';

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
