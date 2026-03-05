import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SnowflakeService } from './snowflake.service';

@Module({
  imports: [ConfigModule],
  providers: [SnowflakeService],
  exports: [SnowflakeService],
})
export class IdModule {}
