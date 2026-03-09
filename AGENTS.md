# Agent Development Guidelines

NestJS (TypeScript ES2023) service using **pnpm**, Jest, ESLint, Prettier, TypeORM (MySQL), Redis (ioredis), Swagger, and socket.io.

No agent rule files are present: no `.cursor/rules/**`, `.cursorrules`, or `.github/copilot-instructions.md`.

## Commands

```bash
# Build
pnpm build

# Run (dev / prod)
pnpm start:dev          # watch mode
pnpm start:prod         # node dist/main

# Lint (runs with --fix by default)
pnpm lint

# Lint without autofix
pnpm exec eslint "{src,apps,libs,test}/**/*.ts"

# Format (Prettier)
pnpm format

# Unit tests
pnpm test               # --passWithNoTests
pnpm test:watch
pnpm test:cov

# E2E tests
pnpm test:e2e           # uses test/jest-e2e.json
```

### Running a Single Test

Jest config: `rootDir: "src"`, `testRegex: ".*\\.spec\\.ts$"`.

```bash
# By relative path inside src/
pnpm test -- infrastructure/mail/mail.service.spec.ts

# By absolute path
pnpm test -- --runTestsByPath src/infrastructure/mail/mail.service.spec.ts

# By test name (substring match)
pnpm test -- -t "should send"
```

## Project Structure

```
src/
  main.ts                       # Bootstrap: ValidationPipe, Swagger, GlobalAuthGuard
  app.module.ts                 # Root module
  auth/                         # JWT + Passport auth, session (Redis), WS guards
  constants/                    # Global key-value lookup table (sys_constant)
  game/                         # WebSocket gateway (socket.io)
  infrastructure/               # Cross-cutting: config, DB, ID, mail, OSS, Swagger
    config/                     # YAML config loader (config/config.yaml)
    db/                         # BaseModel, subscriber, raw SQL schemas
    id/                         # SnowflakeService (global ID generator)
    mail/                       # SMTP mailer with Handlebars templates
    oss/                        # S3-compatible object storage (dynamic module)
  user/                         # User CRUD, login, registration
    third-party/                # Third-party login (strategy pattern)
```

Config is loaded from `config/config.yaml` via `js-yaml` and exposed through `@nestjs/config`. All keys are namespaced under `config.*` (e.g., `configService.get('config.port')`).

## Code Style

### Formatting

- Prettier: **single quotes**, **trailing commas** (`.prettierrc`).
- Prefer small, readable diffs; do not reformat unrelated code.
- ESLint extends `typescript-eslint/recommendedTypeChecked` + `prettier`. `@typescript-eslint/no-explicit-any` is off; `no-floating-promises` is warn.

### Imports

Three groups separated by blank lines:

1. NestJS packages (`@nestjs/*`), then other third-party deps
2. Local parent / infrastructure imports (`../infrastructure/...`, `../auth/...`)
3. Local sibling imports (`./entities/...`, `./dto/...`)

Use `import type { ... }` for type-only imports. Do not introduce path aliases.

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SnowflakeService } from '../infrastructure/id/snowflake.service';

import { User } from './entities/user.entity';
import { RegisterUserDto } from './dto/register-user.dto';
```

### Naming

| Kind             | Convention          | Example                                |
| ---------------- | ------------------- | -------------------------------------- |
| Files            | kebab-case + suffix | `user.service.ts`, `login-user.dto.ts` |
| Classes          | PascalCase          | `UserService`, `RegisterUserDto`       |
| Functions / vars | camelCase           | `findByEmail`, `accessToken`           |
| Constants        | UPPER_SNAKE_CASE    | `BCRYPT_SALT_ROUNDS`                   |
| Entities (table) | snake_case prefix   | `sys_user`, `sys_constant`             |

File suffixes: `.module.ts`, `.service.ts`, `.controller.ts`, `.dto.ts`, `.entity.ts`, `.spec.ts`, `.guard.ts`, `.decorator.ts`, `.strategy.ts`, `.gateway.ts`.

## TypeScript

- `strictNullChecks` is **enabled**; handle `undefined`/`null` explicitly.
- `noImplicitAny` is disabled, but still avoid `any` unless it simplifies interop.
- Target: `ES2023`; module resolution: `nodenext`.
- Prefer explicit return types for public methods and exported functions.
- Catch errors as `unknown` and safely extract details:

```typescript
catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  throw new InternalServerErrorException(message);
}
```

## NestJS Conventions

- **Controllers**: HTTP routing and validation only; delegate business logic to services. Decorate with `@ApiTags()`, `@ApiOperation()`. Use `@JumpAuth()` to mark public endpoints or specify required permissions.
- **Services**: encapsulate domain logic; inject dependencies via constructor. Return typed interfaces (e.g., `UserPublic`, `LoginResult`), not raw entities.
- **DTOs**: use `class-validator` decorators (`@IsString`, `@IsNotEmpty`, `@IsEmail`, etc.) and `@ApiProperty()` for Swagger. `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` is applied globally.
- **Modules**: import `TypeOrmModule.forFeature([...entities])` for DB access. Use `@Global()` sparingly (only `IdModule`, `ConstantModule`).
- **Config**: access via `ConfigService` with namespaced keys: `configService.get('config.db.host')`, `configService.get('config.auth.jwtSecret')`.

## Entities and Database

- All entities extend `BaseModel` (`src/infrastructure/db/base.model.ts`) which provides:
  - `id` — Snowflake bigint as `string` (`@PrimaryColumn`)
  - `createdAt`, `updatedAt` — bigint timestamps (ms), auto-set via `@BeforeInsert` / `@BeforeUpdate`
  - `deletedAt` — soft-delete via `@DeleteDateColumn`
  - `sortedNum` — optional ordering field
- IDs are generated by `SnowflakeService.nextId()` and must be set **before** insert (enforced by `BaseSubscriber`).
- Use explicit `@Column({ type, length, nullable, comment })` definitions.
- Add `@Index()` decorators for compound or unique indexes.
- Soft-delete: use `deletedAt` column; query with `withDeleted: true` when you need deleted rows.

## Auth

- HTTP: JWT Bearer via `@nestjs/passport` + `passport-jwt`. Global `GlobalAuthGuard` checks every route; use `@JumpAuth()` to bypass auth or declare permissions.
- WebSocket: JWT verified in socket.io middleware (`GameGateway`). Session validated against Redis.
- Sessions: single-session enforcement via Redis key `auth:sid:<userId>`. `AuthSessionService.rotateSid()` on login; `assertSid()` on every request.
- Password hashing: `bcryptjs` with 12 salt rounds.

## Testing

- Jest with `ts-jest`. Test files live alongside source: `*.spec.ts`.
- Use direct instantiation with manual mocks (no `Test.createTestingModule` unless testing DI wiring):

```typescript
describe('MailService', () => {
  let service: MailService;
  const sendMailFn = jest.fn();

  beforeEach(() => {
    service = new MailService(
      { sendMail: sendMailFn } as unknown as MailerService,
      { get: jest.fn().mockReturnValue(opts) } as unknown as ConfigService,
    );
  });

  it('should send an email', async () => {
    await service.sendMail({ to: 'a@b.com', subject: 'Hi', text: 'Hello' });
    expect(sendMailFn).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.com' }),
    );
  });
});
```

- Use `jest.fn()` and `as unknown as Type` for mocking injected dependencies.
- Name tests descriptively: `'should <expected behavior>'`.

## Error Handling

- Use NestJS exceptions with actionable messages:
  - `BadRequestException` — invalid input / unsupported operations
  - `UnauthorizedException` — failed auth / deactivated accounts
  - `NotFoundException` — missing resources
  - `ConflictException` — uniqueness violations (duplicate email, etc.)
  - `InternalServerErrorException` — unexpected failures
- For WebSockets, wrap with `WsException(...)`.
- Never leak raw database errors or stack traces to clients.

## Dependency Changes

If a task requires adding a new runtime dependency or changing infrastructure (DB schema, Redis keys, auth flow), explain the trade-offs and **ask before implementing**.
