import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';
import { randomUUID } from 'node:crypto';

import { getJwtRuntimeConfig, toRedisTtlSeconds } from './auth-config';

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async rotateSid(userId: string): Promise<{
    sid: string;
    previousSid: string | null;
    expiresInSeconds: number;
  }> {
    const enabled =
      this.configService.get<boolean>('config.auth.singleSession') ?? true;

    if (!enabled) {
      return {
        sid: 'stateless',
        previousSid: null,
        expiresInSeconds: getJwtRuntimeConfig((key) =>
          this.configService.get(key),
        ).expiresInSeconds,
      };
    }

    const jwt = getJwtRuntimeConfig((key) => this.configService.get(key));
    const sid = randomUUID();
    const ttlSeconds = toRedisTtlSeconds(jwt.expiresInSeconds);

    const key = this.key(userId);
    const previousSid = await this.setWithGetFallback(key, sid, ttlSeconds);

    return {
      sid,
      previousSid,
      expiresInSeconds: jwt.expiresInSeconds,
    };
  }

  async issueSid(
    userId: string,
  ): Promise<{ sid: string; expiresInSeconds: number }> {
    const { sid, expiresInSeconds } = await this.rotateSid(userId);
    return { sid, expiresInSeconds };
  }

  async revokeUser(userId: string): Promise<void> {
    const enabled =
      this.configService.get<boolean>('config.auth.singleSession') ?? true;
    if (!enabled) {
      return;
    }
    await this.redis.del(this.key(userId));
  }

  async assertSid(userId: string, sid: string): Promise<void> {
    const enabled =
      this.configService.get<boolean>('config.auth.singleSession') ?? true;
    if (!enabled) {
      return;
    }

    const current = await this.redis.get(this.key(userId));
    if (!current || current !== sid) {
      throw new UnauthorizedException('Session expired');
    }
  }

  private key(userId: string): string {
    return `auth:sid:${userId}`;
  }

  private async setWithGetFallback(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<string | null> {
    // Prefer Redis SET ... GET (Redis >= 6.2) for an atomic "rotate".
    try {
      const result = await (
        this.redis as unknown as {
          set: (...args: unknown[]) => Promise<unknown>;
        }
      ).set(key, value, 'EX', ttlSeconds, 'GET');

      return typeof result === 'string' && result ? result : null;
    } catch {
      // Fallback: MULTI get+set (not strictly atomic, but works everywhere).
      const res = await this.redis
        .multi()
        .get(key)
        .set(key, value, 'EX', ttlSeconds)
        .exec();

      const previous = res?.[0]?.[1];
      return typeof previous === 'string' && previous ? previous : null;
    }
  }
}
