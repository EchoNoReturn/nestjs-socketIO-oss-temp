import {
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';

import type {
  ThirdPartyConfig,
  ThirdPartyUserInfo,
} from '../interfaces/third-party-user.interface';
import type { ThirdPartyProvider } from '../providers';

// ---------------------------------------------------------------------------
// ToughTalk 响应结构
// ---------------------------------------------------------------------------

interface ToughTalkResponseData {
  id?: string;
  userId?: string;
  nickName?: string;
  firstName?: string;
  lastName?: string;
  phoneVerified?: boolean;
  email?: string;
  verified?: boolean;
  coinBalance?: number;
  exp?: number;
  language?: string;
  bio?: string;
  enableReminder?: boolean;
  zoneId?: string;
  chatId?: string;
  accessSecret?: string;
  defaultPic?: string;
  isVip?: boolean;
  gradeName?: string;
  gradeNum?: number;
  gradeExp?: number;
  gradeExpRange?: number;
  dressCount?: number;
  addition?: string;
  isOpenDaily?: boolean;
  hasPassword?: boolean;
  [key: string]: unknown;
}

interface ToughTalkResponse {
  /** 业务状态码，约定 0 或 200 为成功 */
  code?: number;
  success?: boolean;
  message?: string;
  msg?: string;
  data?: ToughTalkResponseData;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// ToughTalk 配置类型
// ---------------------------------------------------------------------------

export type ToughTalkConfig = NonNullable<ThirdPartyConfig['toughtalk']>;

// ---------------------------------------------------------------------------
// ToughTalk 策略实现
// ---------------------------------------------------------------------------

export class ToughTalkProvider implements ThirdPartyProvider<ToughTalkConfig> {
  async verify(
    params: Record<string, unknown>,
    config: ToughTalkConfig,
    extraHeaders?: Record<string, string>,
  ): Promise<ThirdPartyUserInfo> {
    const url = `${config.endpoint}${config.apiPath}`;

    // 根据配置中声明的 params / query / body 字段，将调用方传入的 params 分配到对应位置
    // 配置中 params 字段 → POST body；query 字段 → URL query string
    const bodyFields: Record<string, unknown> = {};
    const queryFields: Record<string, string> = {};

    if (config.params) {
      for (const key of Object.keys(config.params)) {
        bodyFields[key] = key in params ? params[key] : config.params[key];
      }
    }

    if (config.query) {
      for (const key of Object.keys(config.query)) {
        queryFields[key] = String(
          key in params ? params[key] : config.query[key],
        );
      }
    }

    // 拼接 query string
    const finalUrl =
      Object.keys(queryFields).length > 0
        ? `${url}?${new URLSearchParams(queryFields).toString()}`
        : url;

    // 构造请求头：配置中声明的 headers 优先，调用方附加的 extraHeaders 可覆盖
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.headers ?? {}),
      ...(extraHeaders ?? {}),
    };

    let response: Response;
    try {
      response = await fetch(finalUrl, {
        method: config.method,
        headers,
        body: config.method === 'POST' ? JSON.stringify(bodyFields) : undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`ToughTalk 验证请求失败: ${msg}`);
    }

    if (!response.ok) {
      throw new UnauthorizedException(
        `ToughTalk token 验证失败，HTTP ${response.status}`,
      );
    }

    let payload: ToughTalkResponse;
    try {
      payload = (await response.json()) as ToughTalkResponse;
    } catch {
      throw new InternalServerErrorException('ToughTalk 响应解析失败');
    }

    // 业务层错误判断：code 为 0/200 或 success 为 true 视为成功
    const isSuccess =
      payload.success === true || payload.code === 0 || payload.code === 200;

    if (!isSuccess) {
      const errMsg = payload.message ?? payload.msg ?? '未知错误';
      throw new UnauthorizedException(`ToughTalk token 验证失败: ${errMsg}`);
    }

    const data = payload.data ?? (payload as ToughTalkResponseData);

    // 从响应中提取标准用户信息
    const canonicalId = data.id ?? data.userId;

    if (!canonicalId) {
      throw new InternalServerErrorException(
        'ToughTalk 响应缺少用户唯一标识字段 (id / userId)',
      );
    }

    return {
      // 原始响应数据全量存入（作为扩展字段）
      ...data,
      // 标准字段覆盖，确保类型正确
      id: String(canonicalId),
      displayName: data.nickName,
      avatarUrl: data.defaultPic,
      email: data.email,
      phoneNumber: undefined,
    };
  }
}
