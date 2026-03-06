import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  DeleteDateColumn,
  PrimaryColumn,
} from 'typeorm';

const bigintTransformer = {
  to: (value: number | string): number | string => {
    return value;
  },
  from: (value: number | string | null): number | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return typeof value === 'number' ? value : Number(value);
  },
};

export abstract class BaseModel {
  @PrimaryColumn({
    type: 'bigint',
    unsigned: true,
    transformer: {
      to: (value: string | number): string | number => {
        return value;
      },
      from: (value: string | number): string => {
        return typeof value === 'string' ? value : String(value);
      },
    },
  })
  id: string;

  @Column({
    name: 'createdAt',
    type: 'bigint',
    unsigned: true,
    default: 0,
    transformer: bigintTransformer,
  })
  createdAt: number;

  @Column({
    name: 'updatedAt',
    type: 'bigint',
    unsigned: true,
    default: 0,
    transformer: bigintTransformer,
  })
  updatedAt: number;

  @DeleteDateColumn({
    name: 'deletedAt',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    transformer: bigintTransformer,
  })
  deletedAt: number | null;

  @Column('int', { name: 'sortedNum', default: 1 })
  sortedNum: number;

  @BeforeInsert()
  protected onBeforeInsert(): void {
    const now = Date.now();
    if (!this.createdAt) {
      this.createdAt = now;
    }
    if (!this.updatedAt) {
      this.updatedAt = now;
    }
  }

  @BeforeUpdate()
  protected onBeforeUpdate(): void {
    this.updatedAt = Date.now();
  }
}
