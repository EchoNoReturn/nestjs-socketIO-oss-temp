import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { OSS_CLIENT, OSS_OPTIONS } from './oss.constants';
import type { OssModuleOptions } from './oss.interfaces';

@Injectable()
export class OssService {
  constructor(
    @Inject(OSS_CLIENT) private readonly client: S3Client,
    @Inject(OSS_OPTIONS) private readonly options: OssModuleOptions,
  ) {}

  async upload(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
  ) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string) {
    return this.client.send(
      new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      }),
    );
  }

  async delete(key: string) {
    return this.client.send(
      new DeleteObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      }),
    );
  }
}
