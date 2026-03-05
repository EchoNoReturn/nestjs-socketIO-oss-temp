export interface OssConfigInfo {
  type: 'minio' | 'aws' | 'tencent' | 'aliyun';
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  useSSL?: boolean;
  forcePathStyle?: boolean;
}

export interface RedisConfigInfo {
  host: string;
  port: number;
  db?: number;
  password?: string;
}

export interface MailSmtpConfigInfo {
  host: string;
  port: number;
  secure?: boolean;
  auth?: {
    user?: string;
    pass?: string;
  };
}

export interface MailConfigInfo {
  enabled?: boolean;
  from?: string;
  templatesDir?: string;
  smtp?: MailSmtpConfigInfo;
}
