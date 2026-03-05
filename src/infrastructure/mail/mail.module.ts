import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailConfigInfo } from '../config/config.interfaces';

import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailService } from './mail.service';
import { MAIL_OPTIONS } from './mail.constants';

/**
 * 验证配置值不为空
 * @throws Error 当配置值为空或无效时
 */
function validateConfigValue(
  value: unknown,
  fieldName: string,
): asserts value is string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    throw new Error(`Configuration missing: ${fieldName}`);
  }
}

/**
 * 验证端口号有效性
 * @throws Error 当端口号无效时
 */
function validatePort(
  port: unknown,
  fieldName: string,
): asserts port is number {
  if (typeof port !== 'number' || !Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid port number: ${fieldName}`);
  }
}

/**
 * 构建 SMTP 选项配置
 * @throws Error 当必需的邮件配置缺失或无效时
 */
function buildSmtpOptions(mailConfig: MailConfigInfo) {
  const smtp = mailConfig.smtp;

  // 验证 SMTP 主机
  const host = smtp?.host?.trim() || '';
  validateConfigValue(host, 'config.mail.smtp.host');

  // 验证 SMTP 端口
  validatePort(smtp?.port, 'config.mail.smtp.port');

  // 验证 SMTP 密码
  const pass = smtp?.auth?.pass?.trim() || '';
  validateConfigValue(pass, 'config.mail.smtp.auth.pass');

  const user = smtp?.auth?.user?.trim();
  validateConfigValue(user, 'config.mail.smtp.auth.user');

  return {
    host,
    port: smtp.port,
    secure: Boolean(smtp?.secure),
    auth: {
      user: user || 'apiKey',
      pass,
    },
  };
}

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const mailConfig = configService.get<MailConfigInfo>('config.mail');

        if (!mailConfig) {
          throw new Error('邮件配置缺失: config.mail');
        }
        const templatesDir = mailConfig.templatesDir || 'config/templates/mail';

        const config = buildSmtpOptions(mailConfig);

        return {
          transport: config,
          defaults: {
            from: mailConfig.from?.trim() || '',
          },
          template: {
            dir: templatesDir,
            adapter: new HandlebarsAdapter(), // 这里可以根据需要配置模板适配器，例如 HandlebarsAdapter
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: MAIL_OPTIONS,
      useFactory: (configService: ConfigService) => {
        const mailConfig = configService.get<MailConfigInfo>('config.mail');

        if (!mailConfig) {
          throw new Error('邮件配置缺失: config.mail');
        }

        return mailConfig;
      },
      inject: [ConfigService],
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
