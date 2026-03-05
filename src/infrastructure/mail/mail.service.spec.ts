import { BadRequestException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

import { MailService } from './mail.service';
import type { MailerConfig } from './mail.interfaces';

describe('MailService', () => {
  let service: MailService;
  let mailerService: MailerService;
  let mailOptions: MailerConfig;

  beforeEach(() => {
    mailerService = {
      sendMail: jest.fn(),
    } as unknown as MailerService;

    mailOptions = {
      enabled: true,
      templatesDir: 'config/templates/mail',
      transport: {
        host: 'localhost',
        port: 1025,
      },
    } as MailerConfig;

    service = new MailService(mailerService, mailOptions);
  });

  it('should send email with text or html', async () => {
    const sendMailFn = jest.spyOn(mailerService, 'sendMail');

    await service.send({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Hello',
    });

    expect(sendMailFn).toHaveBeenCalledWith({
      from: undefined,
      to: 'test@example.com',
      subject: 'Test',
      text: 'Hello',
    });
  });

  it('should throw when neither text nor html provided', async () => {
    await expect(
      service.send({
        to: 'test@example.com',
        subject: 'Test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should throw when template files not found', async () => {
    await expect(
      service.sendTemplate({
        to: 'test@example.com',
        template: 'nonexistent',
        variables: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should send verification code', async () => {
    const sendFn = jest.spyOn(service, 'send');

    await service.sendVerificationCode('test@example.com', '123456', 10);

    expect(sendFn).toHaveBeenCalled();
  });

  it('should send verification code with default expiry', async () => {
    const sendFn = jest.spyOn(service, 'send');

    await service.sendVerificationCode('test@example.com', '654321');

    expect(sendFn).toHaveBeenCalled();
  });
});
