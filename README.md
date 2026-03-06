# Toughtalk-Block-Service

Toughtalk Unity 游戏服务。

## 项目描述

基于 [Nest](https://github.com/nestjs/nest) 框架的 TypeScript 项目。

## 项目配置

```bash
$ pnpm install
```

## 编译和运行项目

```bash
# 开发环境
$ pnpm run start

# 监听模式（热重载）
$ pnpm run start:dev

# 生产环境
$ pnpm run start:prod
```

## JWT 认证

### 必需的环境变量

本服务使用 JWT 进行 HTTP 和 WebSocket 认证。

- `JWT_SECRET`（必需）：用于签名/验证访问令牌的密钥
- `JWT_EXPIRES_IN`（可选，默认 `1h`）：令牌有效期
  - 支持的格式：秒数（如 `3600`）或短时长（如 `15m`, `1h`, `7d`）

示例：复制 `.env.example` 为 `.env` 并调整配置值。

```bash
cp .env.example .env
```

注意：`.env` 已被 gitignore，请勿提交敏感信息。

### HTTP 认证流程

1. 登录获取令牌

- `POST /api/users/login`
- 请求体：`{ "account": "用户名或邮箱或手机号", "password": "..." }`
- 响应包含：`access_token`

2. 使用 Bearer 令牌调用受保护的 API

- 请求头：`Authorization: Bearer <access_token>`
- 示例受保护端点：`GET /api/users`

服务端验证：

- `JwtAuthGuard` 强制执行认证
- `JwtStrategy` 验证签名/过期时间并检查用户存在（且未软删除）

### 全局守卫 + JumpAuth

通过全局守卫强制执行认证。

- 默认：所有端点需要 JWT
- 标记端点为公开：`@JumpAuth()`
- 要求权限：`@JumpAuth(['perm:a', 'perm:b'])`

### WebSocket 认证流程

对于受保护的消息处理器（如 `GameGateway` 的 `message` 事件），在握手时提供令牌，支持以下任一方式：

- `handshake.auth.token = "<token>"`（支持可选的 `Bearer ` 前缀）
- `handshake.headers.authorization = "Bearer <token>"`
- `handshake.query.token = "<token>"`

服务端验证：

- `WsJwtGuard` 验证令牌并检查用户存在（且未软删除）
- 验证成功后，将 `{ id, username }` 附加到 `client.data.user`

## 单会话（单实例）

本服务当前设计为**单实例** WebSocket 踢出行为。

### 工作原理

- 登录时，服务器生成 `sid`（会话 ID）并存储在 Redis `auth:sid:<userId>` 键下。
- 访问令牌包含 `{ sub, sid }`。
- 每个 HTTP 请求和 WebSocket 消息，服务器验证令牌中的 `sid` 是否与 Redis 匹配。
  - 如果第二个设备登录，Redis 中的 `sid` 会被替换，旧令牌立即失效。

对于单实例 WebSocket 踢出，套接字在 `socket.data.sid` 中存储其 `sid`，登录时服务器会断开 `sid` 不匹配新令牌的套接字连接。

此外（仅单实例），服务器会在新登录时断开该用户的现有 WebSocket 连接并触发：

- `force_logout` 事件，携带 `{ reason: 'logged_in_elsewhere' }`

### 配置

主要配置示例位于 `config/config.yaml.example`。

- `auth.singleSession`（默认：`true`）：启用基于 Redis 的单会话验证
- `auth.wsKickOnLogin`（默认：`true`）：新登录时断开旧的 WebSocket 连接（仅单实例）

### 迁移到多实例

Redis `sid` 检查可跨实例工作，因此旧令牌仍会失效。但是，**立即断开 WebSocket 连接**需要额外工作：

1. 添加跨实例机制来定位套接字：
   - 选项 A：socket.io Redis 适配器（推荐）
   - 选项 B：Redis pub/sub 频道（广播 `kick(userId)`；每个实例断开其本地套接字）
2. 确保网关握手认证中间件在所有实例上运行。

## Snowflake 用户 ID

用户主键由应用程序使用 Snowflake ID（`@akashrajpurohit/snowflake-id`）生成，而非自增 ID。

### 配置

- `config.id.snowflake.workerId`（0-1023）：多实例必需，每个实例必须唯一
- `config.id.snowflake.epoch`（毫秒）：可选

环境变量覆盖：

- `SNOWFLAKE_WORKER_ID`：覆盖 workerId
- `SNOWFLAKE_MACHINE_ID`：覆盖 workerId（保留兼容性）
- `SNOWFLAKE_EPOCH`：覆盖 epoch

### 多实例注意事项

Snowflake ID 包含每个实例的 worker id。如果两个实例共享相同的 worker id 并同时生成 ID，可能发生冲突。

推荐设置唯一 worker id 的方法：

1. Kubernetes StatefulSet 序号：从 pod 名称索引设置 `SNOWFLAKE_WORKER_ID`。
2. 配置管理：通过 config/secret 为每个实例分配固定的 `workerId`。
3. 基于进程的后备方案（不推荐用于集群）：`process.pid % 1024`。

## SMTP 邮件

本服务包含使用 `@nestjs-modules/mailer` + Handlebars 模板的 SMTP 邮件基础设施。

### 配置

邮件功能默认禁用。在 `config/config.yaml` 中配置（参见 `config/config.yaml.example`）：

- `mail.enabled`：设为 `true` 以启用发送
- `mail.from`：默认 `From` 头
- `mail.templatesDir`：模板根目录（默认 `config/templates/mail`）
- `mail.smtp.host`、`mail.smtp.port`、`mail.smtp.secure`、`mail.smtp.auth.user`、`mail.smtp.auth.pass`

### 模板

模板是 `config/templates/mail/` 中的独立 `.hbs` 文件：

- `<templateName>-subject.hbs`（必需）
- `<templateName>-text.hbs`（可选）
- `<templateName>-html.hbs`（可选）

示例：对于 "welcome" 模板：

- `config/templates/mail/welcome-subject.hbs`
- `config/templates/mail/welcome-text.hbs`
- `config/templates/mail/welcome-html.hbs`

### 使用方法

注入 `MailService` 并调用以下方法之一：

- `mailService.send({ to, subject, text?, html?, from? })` — 发送原始邮件
- `mailService.sendTemplate({ to, template, variables?, from? })` — 渲染并发送基于模板的邮件
- `mailService.sendVerificationCode(to, code, expiresInMinutes?)` — 发送验证码（默认 5 分钟）

示例：

```typescript
// 发送原始邮件
await mailService.send({
  to: 'user@example.com',
  subject: 'Hello',
  text: 'This is a test email',
});

// 发送模板邮件
await mailService.sendTemplate({
  to: 'user@example.com',
  template: 'welcome',
  variables: { userName: 'John' },
});

// 发送验证码
await mailService.sendVerificationCode('user@example.com', '123456', 10);
```

如果邮件功能未启用，所有方法都会抛出 `BadRequestException('Mail is not configured')`。

## 运行测试

```bash
# 单元测试
$ pnpm run test

# e2e 测试
$ pnpm run test:e2e

# 测试覆盖率
$ pnpm run test:cov
```

## 部署

当您准备将 NestJS 应用部署到生产环境时，有一些关键步骤可确保其尽可能高效地运行。查看[部署文档](https://docs.nestjs.com/deployment)了解更多信息。

如果您正在寻找基于云的平台来部署 NestJS 应用，请查看 [Mau](https://mau.nestjs.com)，这是我们在 AWS 上部署 NestJS 应用的官方平台。Mau 使部署变得简单快捷，只需几个简单步骤：

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

使用 Mau，您只需点击几下即可部署应用，让您专注于构建功能而非管理基础设施。

## 资源

查看一些在使用 NestJS 时可能派上用场的资源：

- 访问 [NestJS 文档](https://docs.nestjs.com)了解更多框架信息。
- 如有问题和支持需求，请访问我们的 [Discord 频道](https://discord.gg/G7Qnnhy)。
- 要深入学习并获得更多实践经验，请查看我们的官方视频[课程](https://courses.nestjs.com/)。
- 使用 [NestJS Mau](https://mau.nestjs.com) 只需点击几下即可将应用部署到 AWS。
- 使用 [NestJS Devtools](https://devtools.nestjs.com) 可视化应用图并实时与 NestJS 应用交互。
- 需要项目帮助（兼职到全职）？请查看我们的官方[企业支持](https://enterprise.nestjs.com)。
- 要保持最新并获取更新，请在 [X](https://x.com/nestframework) 和 [LinkedIn](https://linkedin.com/company/nestjs) 上关注我们。
- 寻找工作或有职位空缺？请查看我们的官方[招聘板](https://jobs.nestjs.com)。

## 支持

Nest 是一个 MIT 许可的开源项目。它能够发展得益于赞助商和优秀支持者的支持。如果您想加入他们，请[点击此处了解更多](https://docs.nestjs.com/support)。

## 保持联系

- 作者 - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- 网站 - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## 许可证

Nest 采用 [MIT 许可证](https://github.com/nestjs/nest/blob/master/LICENSE)。
