import { Controller, Get, Logger } from '@nestjs/common';

import { JumpAuth } from './auth/decorators/jump-auth.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @JumpAuth()
  @Get()
  getHello() {
    this.logger.log('getHello called');
    return this.appService.getHello();
  }
}
