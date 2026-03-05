# 邮件模板

此目录包含 SMTP 邮件基础服务所使用的 Handlebars 模板。

## 模板文件

每个模板由此目录中的三个独立的 `.hbs` 文件组成：

- `<templateName>-subject.hbs` (必需) — 邮件主题
- `<templateName>-text.hbs` (可选) — 纯文本版本
- `<templateName>-html.hbs` (可选) — HTML 版本

`text.hbs` 或 `html.hbs` 至少应存在一个。

## 示例

对于 "welcome" 模板，请创建：

- `welcome-subject.hbs`
- `welcome-text.hbs` (可选)
- `welcome-html.hbs` (可选)

## 用法

通过 `mailService.sendTemplate()` 传递模板变量：

```typescript
await mailService.sendTemplate({
  to: 'user@example.com',
  template: 'welcome',
  variables: {
    userName: 'John',
    confirmLink: 'https://example.com/confirm',
  },
});
```

变量使用 Handlebars 语法进行渲染：`{{variableName}}`

## 内置模板

- `verification-code-*` — 验证码邮件，包含 `{{code}}` 和 `{{expiresIn}}` 变量
