import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { AuthTokenService } from '../../auth/auth-token.service';
import { AuthSessionService } from '../../auth/auth-session.service';
import { JumpAuth } from '../../auth/decorators/jump-auth.decorator';
import { WsConnectionRegistryService } from '../../auth/ws-connection-registry.service';

import type { LoginWithTokenResult } from '../user.controller';

import { UserThirdPartyService } from './user-third-party.service';
import { ThirdPartyLoginDto } from './dto/third-party-login.dto';

@ApiTags('Users - Third Party')
@Controller('api/users/third-party')
export class UserThirdPartyController {
  constructor(
    private readonly thirdPartyService: UserThirdPartyService,
    private readonly authTokenService: AuthTokenService,
    private readonly authSessionService: AuthSessionService,
    private readonly wsRegistry: WsConnectionRegistryService,
    private readonly configService: ConfigService,
  ) {}

  @JumpAuth()
  @Post('login')
  @ApiOperation({ summary: '第三方登录' })
  async login(@Body() dto: ThirdPartyLoginDto): Promise<LoginWithTokenResult> {
    // 1. 执行第三方登录逻辑
    const result = await this.thirdPartyService.login(dto);

    // 2. 生成会话和 token（与普通登录流程一致）
    const { sid } = await this.authSessionService.rotateSid(result.user.id);
    const accessToken = await this.authTokenService.signAccessToken({
      id: result.user.id,
      username: result.user.username,
      sid,
    });

    // 3. 可选：踢出其他会话
    const wsKick = this.configService.get<boolean>('config.auth.wsKickOnLogin');
    if (wsKick ?? true) {
      this.wsRegistry.disconnectUser(result.user.id, 'logged_in_elsewhere', {
        exceptSid: sid,
      });
    }

    // 4. 返回结果（与普通登录格式一致）
    return {
      ...result,
      access_token: accessToken,
    };
  }
}
