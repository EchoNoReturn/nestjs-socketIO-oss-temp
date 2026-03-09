import type { ThirdPartyUserInfo } from './third-party-user.interface';

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
