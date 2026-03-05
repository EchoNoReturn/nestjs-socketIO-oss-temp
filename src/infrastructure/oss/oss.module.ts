import { DynamicModule, Module, Provider } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { OSS_OPTIONS, OSS_CLIENT } from './oss.constants';
import {
  OssModuleOptions,
  OssModuleAsyncOptions,
  OssOptionsFactory,
} from './oss.interfaces';
import { OssService } from './oss.service';

@Module({})
export class OssModule {
  static forRoot(options: OssModuleOptions): DynamicModule {
    const client = new S3Client(options);

    return {
      module: OssModule,
      providers: [
        {
          provide: OSS_OPTIONS,
          useValue: options,
        },
        {
          provide: OSS_CLIENT,
          useValue: client,
        },
        OssService,
      ],
      exports: [OssService],
    };
  }

  static forRootAsync(options: OssModuleAsyncOptions): DynamicModule {
    return {
      module: OssModule,
      imports: options.imports,
      providers: [
        ...this.createAsyncProviders(options),
        {
          provide: OSS_CLIENT,
          useFactory: (opts: OssModuleOptions) => {
            return new S3Client(opts);
          },
          inject: [OSS_OPTIONS],
        },
        OssService,
      ],
      exports: [OssService],
    };
  }

  private static createAsyncProviders(
    options: OssModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: OSS_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    const inject = [(options.useExisting || options.useClass) as any];

    return [
      {
        provide: OSS_OPTIONS,
        useFactory: async (factory: OssOptionsFactory) =>
          factory.createOssOptions(),
        inject,
      },
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }
}
