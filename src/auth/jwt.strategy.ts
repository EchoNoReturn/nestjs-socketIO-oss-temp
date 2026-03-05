import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';

import { User } from '../user/entities/user.entity';

import type { JwtAccessPayload } from './auth-token.service';
import { getJwtRuntimeConfig } from './auth-config';
import { AuthSessionService } from './auth-session.service';

export interface JwtUser {
  userId: string;
  username: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly authSessionService: AuthSessionService,
  ) {
    const jwt = getJwtRuntimeConfig((key) => configService.get(key));

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.secret,
    });
  }

  async validate(payload: JwtAccessPayload): Promise<JwtUser> {
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
      throw new UnauthorizedException('Invalid token');
    }

    await this.authSessionService.assertSid(user.id, payload.sid);

    return {
      userId: user.id,
      username: user.username,
    };
  }
}
