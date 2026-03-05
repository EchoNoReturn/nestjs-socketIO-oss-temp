import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtAccessPayload {
  sub: string;
  username?: string | null;
  sid: string;
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  async signAccessToken(user: {
    id: string;
    username?: string | null;
    sid: string;
  }): Promise<string> {
    const payload: JwtAccessPayload = {
      sub: user.id,
      username: user.username,
      sid: user.sid,
    };

    return this.jwtService.signAsync(payload);
  }
}
