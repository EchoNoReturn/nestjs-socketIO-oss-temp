import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ThirdPartyLoginDto {
  @ApiProperty({
    description: '第三方提供的验证 token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  verifyToken: string;

  @ApiProperty({
    description: '第三方类型',
    example: 'toughtalk',
    default: 'toughtalk',
    required: false,
  })
  @IsString()
  @IsOptional()
  type: string = 'toughtalk';
}
