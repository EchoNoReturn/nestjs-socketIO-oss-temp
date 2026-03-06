import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

import { JumpAuth } from '../auth/decorators/jump-auth.decorator';
import { ConstantService } from './constant.service';
import { CreateConstantDto, UpdateConstantDto } from './dto/constant.dto';

@ApiTags('Constants')
@Controller('api/constants')
export class ConstantController {
  constructor(private readonly constantService: ConstantService) {}

  @JumpAuth()
  @Get()
  @ApiQuery({ name: 'includeDisabled', required: false, type: Boolean })
  list(@Query('includeDisabled') includeDisabled?: string): Promise<unknown[]> {
    return this.constantService.list(includeDisabled === 'true');
  }

  @JumpAuth()
  @Post()
  create(@Body() dto: CreateConstantDto): Promise<unknown> {
    return this.constantService.create(dto);
  }

  @JumpAuth()
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConstantDto,
  ): Promise<unknown> {
    return this.constantService.update(id, dto);
  }
}
