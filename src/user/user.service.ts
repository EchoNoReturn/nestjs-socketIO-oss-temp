import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';

import { SnowflakeService } from '../infrastructure/id/snowflake.service';

import { User } from './entities/user.entity';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';

export interface UserPublic {
  id: string;
  username: string;
  email: string | null;
  phoneAreaCode: string | null;
  phoneNumber: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface LoginResult {
  user: UserPublic;
}

export interface RegisterResult {
  user: UserPublic;
}

interface NormalizedRegisterInput {
  username: string;
  password: string;
  email: string | null;
  phoneAreaCode: string | null;
  phoneNumber: string | null;
}

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly snowflake: SnowflakeService,
  ) {}

  async register(dto: RegisterUserDto): Promise<RegisterResult> {
    const input = this.normalizeRegisterInput(dto);
    this.assertRegisterInput(input);
    await this.assertRegisterUniqueness(input);

    const passwordHash = await this.hashPassword(input.password);
    const user = this.userRepository.create({
      id: this.snowflake.nextId(),
      username: input.username,
      passwordHash,
      email: input.email,
      phoneAreaCode: input.phoneAreaCode,
      phoneNumber: input.phoneNumber,
    });

    try {
      const saved = await this.userRepository.save(user);
      return { user: this.toPublic(saved) };
    } catch (error: unknown) {
      this.rethrowRegisterSaveError(error);
    }
  }

  async login(dto: LoginUserDto): Promise<LoginResult> {
    const user = await this.findUserForLogin(dto.account);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await this.verifyPassword(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { user: this.toPublic(user) };
  }

  async listUsers(): Promise<UserPublic[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });

    return users.map((u) => this.toPublic(u));
  }

  private toPublic(user: User): UserPublic {
    return {
      id: user.id,
      username: user.username ?? '',
      email: user.email ?? null,
      phoneAreaCode: user.phoneAreaCode ?? null,
      phoneNumber: user.phoneNumber ?? null,
      createdAt: Number(user.createdAt),
      updatedAt: Number(user.updatedAt),
      deletedAt: user.deletedAt ? Number(user.deletedAt) : null,
    };
  }

  private normalizeRegisterInput(
    dto: RegisterUserDto,
  ): NormalizedRegisterInput {
    const email = dto.email?.trim() || null;

    return {
      username: dto.username.trim(),
      password: dto.password,
      email: email ? email.toLowerCase() : null,
      phoneAreaCode: dto.phoneAreaCode?.trim() || null,
      phoneNumber: dto.phoneNumber?.trim() || null,
    };
  }

  private assertRegisterInput(input: NormalizedRegisterInput): void {
    if (!input.email && !input.phoneNumber) {
      throw new BadRequestException(
        'Either email or phoneNumber must be provided',
      );
    }

    if (input.phoneNumber && !input.phoneAreaCode) {
      throw new BadRequestException(
        'phoneAreaCode is required when phoneNumber is provided',
      );
    }
  }

  private async assertRegisterUniqueness(
    input: NormalizedRegisterInput,
  ): Promise<void> {
    await this.assertUsernameAvailable(input.username);

    if (input.email) {
      await this.assertEmailAvailable(input.email);
    }

    if (input.phoneNumber) {
      await this.assertPhoneNumberAvailable(
        input.phoneAreaCode,
        input.phoneNumber,
      );
    }
  }

  private async assertUsernameAvailable(username: string): Promise<void> {
    const exists = await this.userRepository.findOne({
      where: { username },
      select: { id: true },
      withDeleted: false,
    });

    if (exists) {
      throw new BadRequestException('Username already exists');
    }
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const exists = await this.userRepository.findOne({
      where: { email },
      select: { id: true },
      withDeleted: false,
    });

    if (exists) {
      throw new BadRequestException('Email already exists');
    }
  }

  private async assertPhoneNumberAvailable(
    phoneAreaCode: string | null,
    phoneNumber: string,
  ): Promise<void> {
    const exists = await this.userRepository.findOne({
      where: {
        phoneAreaCode: phoneAreaCode ?? undefined,
        phoneNumber,
      },
      select: { id: true },
      withDeleted: false,
    });

    if (exists) {
      throw new BadRequestException('Phone number already exists');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    } catch {
      throw new InternalServerErrorException('Failed to hash password');
    }
  }

  private async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, passwordHash);
    } catch {
      throw new InternalServerErrorException('Failed to verify password');
    }
  }

  private async findUserForLogin(accountRaw: string): Promise<User | null> {
    const account = accountRaw.trim();
    const accountLower = account.toLowerCase();

    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.deletedAt IS NULL')
        .andWhere(
          '(user.username = :account OR user.email = :accountLower OR user.phone_number = :account)',
          {
            account,
            accountLower,
          },
        )
        .limit(1)
        .getOne();
    } catch {
      throw new InternalServerErrorException('Failed to query user');
    }
  }

  private rethrowRegisterSaveError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const driverError = this.getRecord(
        (error as { driverError?: unknown }).driverError,
      );

      const mysqlErrno = this.getNumber(driverError?.errno);
      const mysqlCode = this.getString(driverError?.code);
      const message =
        this.getString(driverError?.message) ??
        this.getString((error as { message?: unknown }).message) ??
        '';

      if (
        mysqlErrno === 1062 ||
        mysqlCode === 'ER_DUP_ENTRY' ||
        /duplicate/i.test(message)
      ) {
        throw new BadRequestException('User already exists');
      }
    }

    throw new InternalServerErrorException('Failed to create user');
  }

  private getRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private getString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private getNumber(value: unknown): number | null {
    return typeof value === 'number' ? value : null;
  }
}
