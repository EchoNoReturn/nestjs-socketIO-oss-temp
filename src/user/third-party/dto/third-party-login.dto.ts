import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

/** 当前支持的第三方登录类型 */
export const SUPPORTED_THIRD_PARTY_TYPES = ['toughtalk'] as const;
export type ThirdPartyType = (typeof SUPPORTED_THIRD_PARTY_TYPES)[number];

/**
 * 客户端可通过 headers 字段传入的请求头白名单。
 * 只有白名单内的 key 会被透传给第三方，防止注入 Authorization、Host 等敏感头。
 */
export const ALLOWED_EXTRA_HEADER_KEYS: ReadonlySet<string> = new Set([
  'x-request-id',
  'x-trace-id',
]);

export class ThirdPartyLoginDto {
  @ApiProperty({
    description:
      '传递给第三方验证接口的参数，字段由第三方配置的 params/query 决定',
    example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, unknown>;

  @ApiProperty({
    description: `附加请求头（仅允许白名单字段：${[...ALLOWED_EXTRA_HEADER_KEYS].join(', ')}）`,
    example: { 'x-request-id': 'abc123' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiProperty({
    description: '第三方类型',
    enum: SUPPORTED_THIRD_PARTY_TYPES,
    default: 'toughtalk',
    required: false,
  })
  @IsString()
  @IsIn(SUPPORTED_THIRD_PARTY_TYPES)
  @IsOptional()
  type: ThirdPartyType = 'toughtalk';
}
