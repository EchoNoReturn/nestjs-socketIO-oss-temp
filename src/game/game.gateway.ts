import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

import type { Server, Socket } from 'socket.io';

import { AuthSessionService } from '../auth/auth-session.service';
import type { JwtAccessPayload } from '../auth/auth-token.service';
import { WsConnectionRegistryService } from '../auth/ws-connection-registry.service';

type SocketData = {
  user?: {
    id: string;
  };
  sid?: string;
};

type AuthedSocket = Socket<any, any, any, SocketData>;

@WebSocketGateway()
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly authSessionService: AuthSessionService,
    private readonly wsRegistry: WsConnectionRegistryService,
  ) {}

  // socket.io server initialization hook
  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.authenticateSocket(socket as AuthedSocket)
        .then(() => next())
        .catch((err: unknown) => {
          const message =
            err instanceof UnauthorizedException
              ? err.message
              : 'Unauthorized connection';
          next(new Error(message));
        });
    });
  }

  handleConnection(client: AuthedSocket): void {
    const userId = this.getString(client.data?.user?.id);
    if (userId) {
      this.wsRegistry.register(userId, client);
    }
  }

  handleDisconnect(client: AuthedSocket): void {
    this.wsRegistry.unregister(client);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket | undefined, payload: unknown): string {
    const clientId = client?.id ?? 'unknown';
    return `received ${clientId} message: ` + String(payload);
  }

  private async authenticateSocket(socket: AuthedSocket): Promise<void> {
    const token = this.extractToken(socket);
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    let payload: JwtAccessPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtAccessPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    await this.authSessionService.assertSid(payload.sub, payload.sid);
    socket.data.user = { id: payload.sub };
    socket.data.sid = payload.sid;
  }

  private extractToken(socket: AuthedSocket): string | null {
    const handshake = socket.handshake as unknown as {
      auth?: Record<string, unknown>;
      headers?: Record<string, unknown>;
      query?: Record<string, unknown>;
    };

    const authToken = this.getString(handshake.auth?.token);
    if (authToken) {
      return this.stripBearer(authToken);
    }

    const headerAuth = this.getString(handshake.headers?.authorization);
    if (headerAuth) {
      return this.stripBearer(headerAuth);
    }

    const queryToken = this.getString(handshake.query?.token);
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
