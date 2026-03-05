import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    description: 'The username of the user',
    minLength: 3,
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  username: string;

  @ApiProperty({
    description: 'The password of the user',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiPropertyOptional({
    description: 'The email of the user',
    maxLength: 255,
  })
  @ValidateIf((o: RegisterUserDto) => !o.phoneNumber)
  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'The phone number of the user',
    maxLength: 32,
  })
  @ValidateIf((o: RegisterUserDto) => !o.email)
  @IsString()
  @MaxLength(32)
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description:
      'The phone area code of the user, required if phone number is provided',
    maxLength: 10,
  })
  @ValidateIf((o: RegisterUserDto) => Boolean(o.phoneNumber))
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @IsOptional()
  phoneAreaCode?: string;
}
