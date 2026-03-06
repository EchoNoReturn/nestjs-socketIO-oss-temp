import { Column, Entity, Index } from 'typeorm';

import { BaseModel } from '../../infrastructure/db/base.model';

@Entity({ name: 'sys_user' })
@Index('idx_phone', ['phoneAreaCode', 'phoneNumber'], { unique: true })
@Index('idx_deleted_created', ['deletedAt', 'createdAt'])
export class User extends BaseModel {
  @Index('idx_username', { unique: true })
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: '用户名（登录用）',
  })
  username: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    comment: '密码哈希值',
  })
  passwordHash: string;

  @Index('idx_email', { unique: true })
  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: '邮箱（登录用）',
  })
  email: string | null;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: '手机号区号（如+86）',
  })
  phoneAreaCode: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '手机号（登录用）',
  })
  phoneNumber: string | null;
}
