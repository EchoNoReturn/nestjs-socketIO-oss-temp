import { Column, Entity, Index } from 'typeorm';

import { BaseModel } from '../../infrastructure/db/base.model';

@Entity({ name: 'sys_user_third_party_login' })
@Index('idx_type_canonical', ['type', 'canonicalId'], { unique: true })
@Index('idx_user_type', ['userId', 'type'], { unique: true })
@Index('idx_user_id_created', ['userId', 'createdAt'])
@Index('idx_deleted_created', ['deletedAt', 'createdAt'])
export class UserThirdPartyLogin extends BaseModel {
  @Column({ type: 'bigint', unsigned: true, comment: '用户ID' })
  userId: string;

  @Column({
    type: 'varchar',
    length: 32,
    comment: '第三方类型（如google/apple/wechat/github等）',
  })
  type: string;

  @Column({
    type: 'varchar',
    length: 128,
    comment: '第三方规范化唯一ID（type维度内唯一）',
  })
  canonicalId: string;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: '第三方展示名',
  })
  displayName: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '头像URL',
  })
  avatarUrl: string | null;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: '第三方邮箱（如有）',
  })
  email: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    comment: '第三方手机号（如有）',
  })
  phoneNumber: string | null;

  @Column({
    type: 'json',
    nullable: true,
    comment: '第三方扩展信息（原始payload/字段补充）',
  })
  extraJson: Record<string, unknown> | null;
}
