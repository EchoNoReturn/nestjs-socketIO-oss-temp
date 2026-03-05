import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { DataSource } from 'typeorm';

import { User } from '../user/entities/user.entity';

import type { JwtAccessPayload } from './auth-token.service';
import { AuthSessionService } from './auth-session.service';

type WsClient = {
  handshake?: {
    auth?: Record<string, unknown>;
    headers?: Record<string, unknown>;
    query?: Record<string, unknown>;
  };
  data?: Record<string, unknown>;
};

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<WsClient>();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException(new UnauthorizedException('Missing token'));
    }

    let payload: JwtAccessPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtAccessPayload>(token);
    } catch {
      throw new WsException(new UnauthorizedException('Invalid token'));
    }

    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: payload.sub },
      withDeleted: false,
      select: {
        id: true,
        username: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new WsException(new UnauthorizedException('Invalid token'));
    }

    try {
      await this.authSessionService.assertSid(user.id, payload.sid);
    } catch {
      throw new WsException(new UnauthorizedException('Session expired'));
    }

    client.data = {
      ...(client.data ?? {}),
      user: {
        id: user.id,
        username: user.username,
      },
    };

    return true;
  }

  private extractToken(client: WsClient): string | null {
    const authToken = this.getString(client.handshake?.auth?.token);
    if (authToken) {
      return this.stripBearer(authToken);
    }

    const headerAuth = this.getString(client.handshake?.headers?.authorization);
    if (headerAuth) {
      return this.stripBearer(headerAuth);
    }

    const queryToken = this.getString(client.handshake?.query?.token);
    if (queryToken) {
      return this.stripBearer(queryToken);
    }

    return null;
  }

  private stripBearer(value: string): string {
    const trimmed = value.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      return trimmed.slice(7).trim();
    }
    return trimmed;
  }

  private getString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }
}
