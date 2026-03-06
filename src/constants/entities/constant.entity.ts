import { Column, Entity, Index } from 'typeorm';

import { BaseModel } from '../../infrastructure/db/base.model';

@Entity({ name: 'sys_constant' })
@Index('idx_category_code', ['category', 'code'], { unique: true })
@Index('idx_deleted_created', ['deletedAt', 'createdAt'])
@Index('idx_category_sort', ['category', 'sort'])
export class Constant extends BaseModel {
  @Column({
    type: 'varchar',
    length: 64,
    comment: '常量分类（如auth/login_type）',
  })
  category: string;

  @Column({ type: 'varchar', length: 64, comment: '常量编码（分类内唯一）' })
  code: string;

  @Column({ type: 'varchar', length: 128, comment: '常量名称（展示用）' })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '常量值（可选）',
  })
  value: string | null;

  @Column({ type: 'int', default: 0, comment: '排序值（越小越靠前）' })
  sort: number;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '是否启用（1启用0禁用）',
    transformer: {
      to: (value: boolean): number => (value ? 1 : 0),
      from: (value: number): boolean => value === 1,
    },
  })
  enabled: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '备注',
  })
  remark: string | null;
}
