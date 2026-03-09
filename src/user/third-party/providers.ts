import {
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';

import type {
  ThirdPartyConfig,
  ThirdPartyUserInfo,
} from './interfaces/third-party-user.interface';
import { ToughTalkProvider } from './strategies/toughtalk.provider';

/**
 * 第三方登录提供商抽象策略接口
 *
 * @param params  调用方传入的参数键值对，对应第三方配置中 params / query / body 的字段
 * @param config  第三方平台配置（从常量表读取的单个平台配置）
 * @param headers 可选的附加请求头，将覆盖/补充配置中声明的 headers
 */
export interface ThirdPartyProvider<TConfig> {
  verify(
    params: Record<string, unknown>,
    config: TConfig,
    headers?: Record<string, string>,
  ): Promise<ThirdPartyUserInfo>;
}

// ---------------------------------------------------------------------------
// 策略注册表 —— 根据 type 路由到对应策略
// ---------------------------------------------------------------------------

const PROVIDERS = {
  toughtalk: new ToughTalkProvider(),
} as const;

type SupportedType = keyof typeof PROVIDERS;

function isSupportedType(type: string): type is SupportedType {
  return type in PROVIDERS;
}

// ---------------------------------------------------------------------------
// verifyThirdParty 重载声明
// ---------------------------------------------------------------------------

/**
 * 重载 1：仅传入调用参数，从全局配置对象中自动读取该 type 的平台配置
 */
export async function verifyThirdParty(
  type: string,
  params: Record<string, unknown>,
  config: ThirdPartyConfig,
): Promise<ThirdPartyUserInfo>;

/**
 * 重载 2：传入调用参数、附加请求头，从全局配置对象中自动读取该 type 的平台配置
 */
export async function verifyThirdParty(
  type: string,
  params: Record<string, unknown>,
  config: ThirdPartyConfig,
  headers: Record<string, string>,
): Promise<ThirdPartyUserInfo>;

/**
 * 重载 3：直接传入单个平台配置（跳过全局配置查找），并可附加请求头
 */
export async function verifyThirdParty<TConfig>(
  type: string,
  params: Record<string, unknown>,
  platformConfig: TConfig,
  headers?: Record<string, string>,
): Promise<ThirdPartyUserInfo>;

// ---------------------------------------------------------------------------
// 实现
// ---------------------------------------------------------------------------

export async function verifyThirdParty(
  type: string,
  params: Record<string, unknown>,
  configOrPlatformConfig: ThirdPartyConfig,
  headers?: Record<string, string>,
): Promise<ThirdPartyUserInfo> {
  if (!isSupportedType(type)) {
    throw new UnauthorizedException(`第三方类型 '${type}' 暂不支持`);
  }

  // 判断传入的是全局 ThirdPartyConfig 还是单个平台配置：
  // 全局配置是普通对象，其键是平台名（toughtalk / apple / google …）；
  // 如果对象中存在当前 type 键，则视为全局配置并提取对应平台配置。
  let platformConfig: unknown;
  const maybeGlobal = configOrPlatformConfig as Record<string, unknown>;
  if (type in maybeGlobal) {
    platformConfig = maybeGlobal[type];
  } else {
    platformConfig = configOrPlatformConfig;
  }

  if (!platformConfig) {
    throw new InternalServerErrorException(`第三方类型 '${type}' 配置缺失`);
  }

  // TypeScript 知道 type 是 SupportedType，但 platformConfig 的类型需要强转给对应 provider
  // 通过 as 处理，运行时安全由配置校验保证
  return PROVIDERS[type].verify(params, platformConfig as never, headers);
}
