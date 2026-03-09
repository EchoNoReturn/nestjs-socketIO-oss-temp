import {
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';

import type {
  ThirdPartyConfig,
  ThirdPartyUserInfo,
} from './interfaces/third-party-user.interface';
export type { ThirdPartyProvider } from './interfaces/third-party-provider.interface';
export { assertValue, resolveParams } from './utils/assert-value';
import { ToughTalkProvider } from './strategies/toughtalk.provider';

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
    throw new UnauthorizedException(
      `Third-party type '${type}' is not supported`,
    );
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
    throw new InternalServerErrorException(
      `Configuration for third-party type '${type}' is missing`,
    );
  }

  // TypeScript 知道 type 是 SupportedType，但 platformConfig 的类型需要强转给对应 provider
  // 通过 as 处理，运行时安全由配置校验保证
  return PROVIDERS[type].verify(params, platformConfig as never, headers);
}
