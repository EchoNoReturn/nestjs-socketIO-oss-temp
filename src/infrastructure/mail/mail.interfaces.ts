import type { ModuleMetadata, Type } from '@nestjs/common';
import type { MailerOptions } from '@nestjs-modules/mailer';

export interface MailSmtpAuth {
  user?: string;
  pass: string;
}

export interface MailSmtpOptions {
  host: string;
  port: number;
  secure?: boolean;
  auth?: MailSmtpAuth;
}

export interface MailModuleOptions {
  enabled: boolean;
  from: string;
  templatesDir: string;
  smtp: MailSmtpOptions;
}

export interface MailerConfig extends MailerOptions {
  enabled: boolean;
  templatesDir: string;
}

export interface MailOptionsFactory {
  createMailOptions(): Promise<MailModuleOptions> | MailModuleOptions;
}

export interface MailModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  useExisting?: Type<MailOptionsFactory>;
  useClass?: Type<MailOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<MailModuleOptions> | MailModuleOptions;
  inject?: any[];
}

export interface MailSendOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface MailSendTemplateOptions {
  to: string;
  template: string;
  variables?: Record<string, unknown>;
  from?: string;
}
