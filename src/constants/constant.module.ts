import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Constant } from './entities/constant.entity';
import { ConstantService } from './constant.service';
import { ConstantController } from './constant.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Constant])],
  providers: [ConstantService],
  controllers: [ConstantController],
  exports: [ConstantService],
})
export class ConstantModule {}
