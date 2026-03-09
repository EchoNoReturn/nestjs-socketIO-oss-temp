/**
 * 第三方验证接口返回的用户信息
 */
export interface ThirdPartyUserInfo {
  /** 第三方用户唯一ID（映射到 canonicalId） */
  id: string;

  /** 显示名称 */
  displayName?: string;

  /** 邮箱 */
  email?: string;

  /** 头像URL */
  avatarUrl?: string;

  /** 手机号 */
  phoneNumber?: string;

  /** 其他扩展字段（会存储到 extraJson） */
  [key: string]: unknown;
}

/**
 * 第三方配置结构（从常量表读取）
 */
export interface ThirdPartyConfig {
  toughtalk?: {
    endpoint: string;
    apiPath: string;
    method: 'GET' | 'POST';
    params?: {
      // key: type str 形式
      [key: string]: string;
    };
    query?: {
      // key: type str 形式
      [key: string]: string;
    };
    headers?: {
      // key: type str 形式
      [key: string]: string;
    };
  };
  apple?: string;
  google?: string;
  [key: string]: string | Record<string, any> | undefined;
}
