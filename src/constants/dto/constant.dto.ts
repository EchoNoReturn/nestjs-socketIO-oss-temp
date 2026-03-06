import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateConstantDto {
  @ApiProperty({
    description: 'Constant category',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  category: string;

  @ApiProperty({
    description: 'Constant code',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code: string;

  @ApiProperty({
    description: 'Constant name',
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @ApiPropertyOptional({
    description: 'Constant value',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  value?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    minimum: 0,
    maximum: 999999,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999999)
  sort?: number;

  @ApiPropertyOptional({
    description: 'Whether enabled',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Remark',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  remark?: string;
}

export class UpdateConstantDto {
  @ApiPropertyOptional({
    description: 'Constant name',
    maxLength: 128,
  })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({
    description: 'Constant value',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  value?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    minimum: 0,
    maximum: 999999,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999999)
  sort?: number;

  @ApiPropertyOptional({
    description: 'Whether enabled',
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Remark',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  remark?: string;
}
