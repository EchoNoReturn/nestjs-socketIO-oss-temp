import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

import { ConstantService } from '../../constants/constant.service';
import { SnowflakeService } from '../../infrastructure/id/snowflake.service';

import { User } from '../entities/user.entity';
import type { UserPublic, LoginResult } from '../user.service';

import { UserThirdPartyLogin } from './entities/user-third-party-login.entity';
import type { ThirdPartyLoginDto } from './dto/third-party-login.dto';
import { ALLOWED_EXTRA_HEADER_KEYS } from './dto/third-party-login.dto';
import type {
  ThirdPartyUserInfo,
  ThirdPartyConfig,
} from './interfaces/third-party-user.interface';
import { verifyThirdParty } from './providers';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class UserThirdPartyService {
  private readonly logger = new Logger(UserThirdPartyService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserThirdPartyLogin)
    private readonly thirdPartyRepository: Repository<UserThirdPartyLogin>,
    private readonly constantService: ConstantService,
    private readonly snowflake: SnowflakeService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 主入口：第三方登录
   */
  async login(dto: ThirdPartyLoginDto): Promise<LoginResult> {
    // 1. 获取第三方配置
    const config = await this.getThirdPartyConfig();
    if (!config[dto.type]) {
      throw new BadRequestException(`第三方类型 '${dto.type}' 未配置验证地址`);
    }

    // 对 dto.headers 做白名单过滤，只透传允许的请求头，防止注入 Authorization / Host 等敏感头
    const safeHeaders: Record<string, string> = {};
    if (dto.headers) {
      for (const key of ALLOWED_EXTRA_HEADER_KEYS) {
        if (dto.headers[key] !== undefined) {
          safeHeaders[key] = dto.headers[key];
        }
      }
    }

    // 2. 验证 token，路由到对应策略
    // TODO: 这里目前只考虑了 toughtalk 的登录，如果需要增加其他第三方登录，需要在 providers.ts 中注册对应的策略，并在这里调用
    const thirdPartyUser = await verifyThirdParty(
      dto.type,
      dto.data,
      config,
      safeHeaders,
    );

    if (!thirdPartyUser || !thirdPartyUser.id) {
      throw new UnauthorizedException(
        `第三方登录(${dto.type})验证失败，未返回有效用户信息`,
      );
    }

    // 3. 查找或创建用户
    const user = await this.findOrCreateUser(dto.type, thirdPartyUser);

    // 4. 返回登录结果
    return { user: this.toPublic(user) };
  }

  /**
   * 从常量表获取第三方配置
   */
  private async getThirdPartyConfig(): Promise<ThirdPartyConfig> {
    const configStr = await this.constantService.getValue(
      'auth',
      'AUTH_THIRD_CONFIG',
    );

    if (!configStr) {
      throw new InternalServerErrorException(
        '第三方登录配置缺失，请联系管理员',
      );
    }

    try {
      // 给 configStr 去除首尾的呀引号
      const trimmedConfigStr = configStr.trim().replace(/^"|"$/g, '');
      return JSON.parse(trimmedConfigStr) as ThirdPartyConfig;
    } catch {
      throw new InternalServerErrorException(
        '第三方登录配置格式错误，请联系管理员',
      );
    }
  }

  /**
   * 查找或创建用户
   */
  private async findOrCreateUser(
    type: string,
    thirdPartyUser: ThirdPartyUserInfo,
  ): Promise<User> {
    // 1. 查询第三方登录记录（只查未删除的）
    const thirdPartyLogin = await this.thirdPartyRepository.findOne({
      where: {
        type,
        canonicalId: thirdPartyUser.id,
        deletedAt: IsNull(),
      },
    });

    // 2. 如果找不到，说明是新用户，执行注册
    if (!thirdPartyLogin) {
      return await this.registerThirdPartyUser(type, thirdPartyUser);
    }

    // 3. 查询对应的用户
    const user = await this.userRepository.findOne({
      where: { id: thirdPartyLogin.userId },
      withDeleted: true, // 包含已删除的用户
    });

    if (!user) {
      throw new InternalServerErrorException('用户数据异常，请联系管理员');
    }

    // 4. 检查用户是否已注销
    if (user.deletedAt) {
      throw new UnauthorizedException('用户账号已被注销');
    }

    // 5. 返回正常用户
    return user;
  }

  /**
   * 注册新的第三方用户（使用事务）
   */
  private async registerThirdPartyUser(
    type: string,
    thirdPartyUser: ThirdPartyUserInfo,
  ): Promise<User> {
    // 检查邮箱冲突
    if (thirdPartyUser.email) {
      await this.assertEmailAvailable(thirdPartyUser.email);
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. 生成用户名
      const username = this.generateUsername(type, thirdPartyUser.id);

      // 2. 创建用户
      const user = manager.create(User, {
        id: this.snowflake.nextId(),
        username,
        passwordHash: await this.generatePlaceholderPasswordHash(),
        email: thirdPartyUser.email || null,
        phoneAreaCode: null,
        phoneNumber: thirdPartyUser.phoneNumber || null,
      });
      await manager.save(user);

      // 3. 创建第三方登录记录
      const thirdPartyLogin = manager.create(UserThirdPartyLogin, {
        id: this.snowflake.nextId(),
        userId: user.id,
        type,
        canonicalId: thirdPartyUser.id,
        displayName: thirdPartyUser.displayName || null,
        avatarUrl: thirdPartyUser.avatarUrl || null,
        email: thirdPartyUser.email || null,
        phoneNumber: thirdPartyUser.phoneNumber || null,
        extraJson: thirdPartyUser,
      });
      await manager.save(thirdPartyLogin);

      return user;
    });
  }

  /**
   * 生成用户名（方案A：type_canonicalId）
   * TODO: 后续可能需要调整为更友好的方式
   */
  private generateUsername(type: string, canonicalId: string): string {
    return `${type}_${canonicalId}`;
  }

  /**
   * 生成占位符密码哈希
   */
  private async generatePlaceholderPasswordHash(): Promise<string> {
    const randomPassword = randomUUID();
    return await bcrypt.hash(randomPassword, BCRYPT_SALT_ROUNDS);
  }

  /**
   * 检查邮箱是否可用
   */
  private async assertEmailAvailable(email: string): Promise<void> {
    const exists = await this.userRepository.findOne({
      where: { email },
      select: { id: true },
      withDeleted: false,
    });

    if (exists) {
      throw new ConflictException(
        '该邮箱已被其他账户使用，请使用其他登录方式或联系管理员',
      );
    }
  }

  /**
   * 转换为公开用户信息
   */
  private toPublic(user: User): UserPublic {
    return {
      id: user.id,
      username: user.username ?? '',
      email: user.email ?? null,
      phoneAreaCode: user.phoneAreaCode ?? null,
      phoneNumber: user.phoneNumber ?? null,
      createdAt: Number(user.createdAt),
      updatedAt: Number(user.updatedAt),
      deletedAt: user.deletedAt ? Number(user.deletedAt) : null,
    };
  }
}
