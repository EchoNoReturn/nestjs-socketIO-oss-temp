import { ModuleMetadata, Type } from '@nestjs/common';
import { S3ClientConfig } from '@aws-sdk/client-s3';

export interface OssModuleOptions extends S3ClientConfig {
  bucket: string;
  type: 'minio' | 'aws' | 'tencent' | 'aliyun';
}

export interface OssOptionsFactory {
  createOssOptions(): Promise<OssModuleOptions> | OssModuleOptions;
}

export interface OssModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<OssOptionsFactory>;
  useClass?: Type<OssOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<OssModuleOptions> | OssModuleOptions;
  inject?: any[];
}
