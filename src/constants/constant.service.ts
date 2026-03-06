import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Constant } from './entities/constant.entity';
import { CreateConstantDto, UpdateConstantDto } from './dto/constant.dto';
import { SnowflakeService } from 'src/infrastructure/id/snowflake.service';

export interface ConstantItem {
  id: string;
  category: string;
  code: string;
  name: string;
  value: string | null;
  sort: number;
  enabled: boolean;
  remark: string | null;
}

export interface ConstantGroup {
  category: string;
  items: ConstantItem[];
}

@Injectable()
export class ConstantService {
  constructor(
    @InjectRepository(Constant)
    private readonly constantRepository: Repository<Constant>,
    private readonly snowflakeService: SnowflakeService,
  ) {}

  async findAll(): Promise<ConstantItem[]> {
    return this.constantRepository.find({
      where: { enabled: true },
      order: { category: 'ASC', sort: 'ASC' },
    });
  }

  async findByCategory(category: string): Promise<ConstantItem[]> {
    return this.constantRepository.find({
      where: { category, enabled: true },
      order: { sort: 'ASC' },
    });
  }

  async findByCategories(categories: string[]): Promise<ConstantGroup[]> {
    if (categories.length === 0) {
      return [];
    }

    const constants = await this.constantRepository.find({
      where: { category: In(categories), enabled: true },
      order: { category: 'ASC', sort: 'ASC' },
    });

    const groupMap = new Map<string, ConstantItem[]>();
    for (const item of constants) {
      const list = groupMap.get(item.category) ?? [];
      list.push(item);
      groupMap.set(item.category, list);
    }

    return Array.from(groupMap.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }

  async findByCode(
    category: string,
    code: string,
  ): Promise<ConstantItem | null> {
    return this.constantRepository.findOne({
      where: { category, code, enabled: true },
    });
  }

  async getValue(category: string, code: string): Promise<string | null> {
    const constant = await this.findByCode(category, code);
    return constant?.value ?? null;
  }

  async list(includeDisabled = false): Promise<Constant[]> {
    const where: Record<string, unknown> = {};
    if (!includeDisabled) {
      where.enabled = true;
    }
    return this.constantRepository.find({
      where,
      order: { category: 'ASC', sort: 'ASC' },
    });
  }

  async create(dto: CreateConstantDto): Promise<Constant> {
    // 判断是否存在相同的 category 和 code
    const existingConstant = await this.constantRepository.findOne({
      where: { category: dto.category, code: dto.code },
    });
    if (existingConstant) {
      throw new BadRequestException(
        `Constant with category ${dto.category} and code ${dto.code} already exists`,
      );
    }

    const constant = this.constantRepository.create({
      id: this.snowflakeService.nextId(),
      category: dto.category,
      code: dto.code,
      name: dto.name,
      value: dto.value ?? null,
      sort: dto.sort ?? 0,
      enabled: dto.enabled ?? true,
      remark: dto.remark ?? null,
    });
    return this.constantRepository.save(constant);
  }

  async update(id: string, dto: UpdateConstantDto): Promise<Constant> {
    const constant = await this.constantRepository.findOne({
      where: { id },
    });
    if (!constant) {
      throw new NotFoundException(`Constant with id ${id} not found`);
    }

    if (dto.name !== undefined) {
      constant.name = dto.name;
    }
    if (dto.value !== undefined) {
      constant.value = dto.value;
    }
    if (dto.sort !== undefined) {
      constant.sort = dto.sort;
    }
    if (dto.enabled !== undefined) {
      constant.enabled = dto.enabled;
    }
    if (dto.remark !== undefined) {
      constant.remark = dto.remark;
    }

    return this.constantRepository.save(constant);
  }
}
