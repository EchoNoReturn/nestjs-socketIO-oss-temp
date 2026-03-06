import type { DynamicModule, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';

import configurationLoader from './config';
import { DBConfig } from './db';
import { OssConfigInfo, RedisConfigInfo } from './config/config.interfaces';
import { OssModule } from './oss/oss.module';
import { MailModule } from './mail/mail.module';
import { IdModule } from './id/id.module';
import { ConstantModule } from '../constants/constant.module';

/**
 * 构建 OSS 模块配置
 */
function buildOssModuleConfig(): DynamicModule {
  return OssModule.forRootAsync({
    useFactory: (configService: ConfigService) => {
      const ossConfig = configService.get<OssConfigInfo>('config.oss');

      if (!ossConfig) {
        throw new Error('OSS configuration is missing.');
      }

      return {
        region: ossConfig.region,
        credentials: {
          accessKeyId: ossConfig.accessKeyId,
          secretAccessKey: ossConfig.secretAccessKey,
        },
        bucket: ossConfig.bucket,
        type: ossConfig.type,
        endpoint: ossConfig.endpoint,
        useSSL: ossConfig.useSSL,
        forcePathStyle: ossConfig.forcePathStyle,
      };
    },
    inject: [ConfigService],
  });
}

/**
 * 构建数据库模块配置
 */
function buildDatabaseModuleConfig(): DynamicModule {
  return TypeOrmModule.forRootAsync({
    useFactory: (configService: ConfigService) => {
      const dbConfig = configService.get<DBConfig>('config.db');

      if (!dbConfig) {
        throw new Error('Database configuration is missing.');
      }

      return {
        type: dbConfig.type,
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        synchronize: dbConfig.synchronize ?? false,
        autoLoadEntities: true,
      };
    },
    inject: [ConfigService],
  });
}

/**
 * 构建 Redis 模块配置
 */
function buildRedisModuleConfig(): DynamicModule {
  return RedisModule.forRootAsync({
    useFactory: (configService: ConfigService) => {
      const redisConfig = configService.get<RedisConfigInfo>('config.redis');

      if (!redisConfig) {
        throw new Error('Redis configuration is missing.');
      }

      return {
        type: 'single',
        options: {
          db: redisConfig.db || 0,
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
        },
      };
    },
    inject: [ConfigService],
  });
}

/**
 * 基础设施模块初始化方法
 * 统一管理基础设施相关模块的注册（OSS、数据库、缓存、邮件等）
 *
 * @returns 包含所有基础设施模块的动态模块数组
 */
export function initializeInfrastructureModules(): (
  | Promise<DynamicModule>
  | DynamicModule
  | Type<unknown>
)[] {
  return [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configurationLoader],
      ignoreEnvFile: false,
    }),
    buildOssModuleConfig(),
    buildDatabaseModuleConfig(),
    buildRedisModuleConfig(),
    MailModule,
    IdModule,
    ConstantModule,
  ];
}
