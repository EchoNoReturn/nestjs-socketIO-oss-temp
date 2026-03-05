# Agent Development Guidelines

This repo is a NestJS (TypeScript ES2023) service using pnpm, Jest, ESLint, Prettier, TypeORM, Redis, and Swagger.

No agent rule files are present: no `.cursor/rules/**`, `.cursorrules`, or `.github/copilot-instructions.md`.

## Commands

```bash
# Build
pnpm build

# Run (dev/prod)
pnpm start:dev
pnpm start:prod

# Lint (NOTE: script runs with --fix)
pnpm lint

# Format (prettier)
pnpm format

# Unit tests
pnpm test
pnpm test:watch
pnpm test:cov

# E2E tests
pnpm test:e2e
```

### Run A Single Jest Test

Jest is configured with `rootDir: "src"` and `testRegex: ".*\\.spec\\.ts$"`.

```bash
# Run one spec (path is relative to src/)
pnpm test -- user/user.service.spec.ts

# Or run by path
pnpm test -- --runTestsByPath src/user/user.service.spec.ts

# Run by test name
pnpm test -- -t "should register"
```

If you want lint results without autofix:

```bash
pnpm exec eslint "{src,apps,libs,test}/**/*.ts"
```

## Code Style

### Formatting

- Prettier: single quotes, trailing commas (see `.prettierrc`).
- Prefer small, readable diffs; do not reformat unrelated code.

### Imports

- Order: NestJS (`@nestjs/*`), other deps, local relative imports.
- Use `import type { ... }` for types.
- Do not introduce path aliases unless the repo already uses/configures them.

### Naming

- Files: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.dto.ts`, `*.entity.ts`, `*.spec.ts`.
- Classes: `PascalCase`; functions/vars: `camelCase`; constants: `UPPER_SNAKE_CASE`.

## TypeScript

- `strictNullChecks` is enabled; handle `undefined`/`null` explicitly.
- `noImplicitAny` is disabled, but still avoid `any` unless it simplifies interop.
- Prefer explicit return types for public methods and exported functions.
- When catching errors, treat them as `unknown` and safely extract details (avoid unsafe assumptions).

## NestJS Conventions

- Controllers: HTTP routing/validation only; keep business logic in services.
- Services: encapsulate domain logic; keep dependencies injected.
- DTOs: use `class-validator` / `class-transformer` patterns.
- Global validation is configured with `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` (see `src/main.ts`).
- Config: `ConfigService` keys are namespaced (e.g., `config.get('config.port')`).

## Error Handling

- Use Nest exceptions (`BadRequestException`, `UnauthorizedException`, `NotFoundException`, `InternalServerErrorException`) with actionable messages.
- For WebSockets, wrap with `WsException(...)`.
- Do not leak raw database or internal errors to clients; log internally if needed.

## Dependency Changes

If a task requires adding a new runtime dependency or changing infra posture (DB/auth/cache), explain the trade-offs and ask before implementing.
