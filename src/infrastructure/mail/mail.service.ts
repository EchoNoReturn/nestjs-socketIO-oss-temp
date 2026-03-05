import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { compile } from 'handlebars';

import { MAIL_OPTIONS } from './mail.constants';
import type {
  MailSendOptions,
  MailSendTemplateOptions,
} from './mail.interfaces';
import * as configInterfaces from '../config/config.interfaces';

@Injectable()
export class MailService {
  private templatesDir: string;
  private fromAddress: string;

  constructor(
    private readonly mailerService: MailerService,
    @Inject(MAIL_OPTIONS)
    private readonly mailOptions: configInterfaces.MailConfigInfo,
  ) {
    this.templatesDir = mailOptions.templatesDir ?? 'config/templates/mail';
    this.fromAddress =
      mailOptions.from ?? '"Tough Blocks Service" <donotreply@toughtalk.app>';
  }

  async send(input: MailSendOptions): Promise<void> {
    if (!input.text && !input.html) {
      throw new BadRequestException('Either text or html must be provided');
    }

    try {
      await this.mailerService.sendMail({
        from: input.from ?? this.fromAddress,
        to: input.to,
        subject: input.subject,
        ...(input.text ? { text: input.text } : {}),
        ...(input.html ? { html: input.html } : {}),
      });
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === 'ENOTFOUND' || err?.message?.includes('disabled')) {
        throw new BadRequestException('Mail is not configured');
      }
      throw error;
    }
  }

  async sendTemplate(input: MailSendTemplateOptions): Promise<void> {
    const variables = input.variables ?? {};

    try {
      const subject = await this.renderTemplateFile(
        `${input.template}-subject`,
        variables,
      );
      const text = await this.renderTemplateFile(
        `${input.template}-text`,
        variables,
        true,
      ).catch(() => null);
      const html = await this.renderTemplateFile(
        `${input.template}-html`,
        variables,
        true,
      ).catch(() => null);

      await this.send({
        from: input.from ?? this.fromAddress,
        to: input.to,
        subject,
        text: text || undefined,
        html: html || undefined,
      });
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === 'ENOENT') {
        throw new BadRequestException(
          `Mail template '${input.template}' not found`,
        );
      }
      if (err?.code === 'ENOTFOUND' || err?.message?.includes('disabled')) {
        throw new BadRequestException('Mail is not configured');
      }
      throw error;
    }
  }

  async sendVerificationCode(
    to: string,
    code: string,
    expiresInMinutes?: number,
  ): Promise<void> {
    const expiresIn = expiresInMinutes ?? 5;
    await this.sendTemplate({
      to,
      template: 'verification-code',
      variables: {
        code,
        expiresIn,
      },
    });
  }

  private async renderTemplateFile(
    templateName: string,
    variables: Record<string, unknown>,
    optional = false,
  ): Promise<string> {
    const filePath = path.join(this.templatesDir, `${templateName}.hbs`);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const tpl = compile(content);
      return tpl(variables);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (optional && err?.code === 'ENOENT') {
        return '';
      }
      throw error;
    }
  }
}
