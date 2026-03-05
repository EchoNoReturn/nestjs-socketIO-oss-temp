import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthTokenService } from './auth-token.service';
import { AuthSessionService } from './auth-session.service';
import { GlobalAuthGuard } from './global-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { WsConnectionRegistryService } from './ws-connection-registry.service';
import { WsJwtGuard } from './ws-jwt.guard';
import { getJwtRuntimeConfig } from './auth-config';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwt = getJwtRuntimeConfig((key) => config.get(key));

        return {
          secret: jwt.secret,
          signOptions: {
            expiresIn: jwt.expiresInSeconds,
          },
        };
      },
    }),
  ],
  providers: [
    AuthTokenService,
    AuthSessionService,
    JwtStrategy,
    JwtAuthGuard,
    WsJwtGuard,
    GlobalAuthGuard,
    WsConnectionRegistryService,
  ],
  exports: [
    AuthTokenService,
    AuthSessionService,
    GlobalAuthGuard,
    JwtAuthGuard,
    WsJwtGuard,
    JwtModule,
    WsConnectionRegistryService,
  ],
})
export class AuthModule {}
