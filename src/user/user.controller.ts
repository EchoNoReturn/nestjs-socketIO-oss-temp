import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';

import { AuthTokenService } from '../auth/auth-token.service';
import { AuthSessionService } from '../auth/auth-session.service';
import { JumpAuth } from '../auth/decorators/jump-auth.decorator';
import { WsConnectionRegistryService } from '../auth/ws-connection-registry.service';

import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import type { LoginResult, RegisterResult, UserPublic } from './user.service';
import { UserService } from './user.service';

export interface LoginWithTokenResult extends LoginResult {
  access_token: string;
}

@Controller('api/users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authTokenService: AuthTokenService,
    private readonly authSessionService: AuthSessionService,
    private readonly wsRegistry: WsConnectionRegistryService,
    private readonly configService: ConfigService,
  ) {}

  @JumpAuth()
  @Post('register')
  register(@Body() dto: RegisterUserDto): Promise<RegisterResult> {
    return this.userService.register(dto);
  }

  @Get()
  list(): Promise<UserPublic[]> {
    return this.userService.listUsers();
  }

  @JumpAuth()
  @Post('login')
  async login(@Body() dto: LoginUserDto): Promise<LoginWithTokenResult> {
    const result = await this.userService.login(dto);

    const { sid } = await this.authSessionService.rotateSid(result.user.id);
    const accessToken = await this.authTokenService.signAccessToken({
      id: result.user.id,
      username: result.user.username,
      sid,
    });

    const wsKick = this.configService.get<boolean>('config.auth.wsKickOnLogin');
    if (wsKick ?? true) {
      // single-instance: immediately disconnect older sockets
      this.wsRegistry.disconnectUser(result.user.id, 'logged_in_elsewhere', {
        exceptSid: sid,
      });
    }

    return {
      ...result,
      access_token: accessToken,
    };
  }

  @Post('logout')
  async logout(@Req() req: Request): Promise<{ ok: true }> {
    const userId = this.getUserIdFromRequest(req);
    await this.authSessionService.revokeUser(userId);
    this.wsRegistry.disconnectUser(userId, 'logout');
    return { ok: true };
  }

  private getUserIdFromRequest(req: Request): string {
    const user = (req as unknown as { user?: unknown }).user as
      | { userId?: unknown }
      | undefined;
    const userId = user?.userId;
    if (typeof userId !== 'string' || !userId) {
      throw new InternalServerErrorException('Missing req.user.userId');
    }
    return userId;
  }
}
