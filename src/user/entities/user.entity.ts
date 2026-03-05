import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user' })
@Index('idx_phone', ['phoneAreaCode', 'phoneNumber'], { unique: true })
@Index('idx_deleted_created', ['deletedAt', 'createdAt'])
export class User {
  @PrimaryColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Index('idx_username', { unique: true })
  @Column({
    name: 'username',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  username: string | null;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash: string;

  @Index('idx_email', { unique: true })
  @Column({
    name: 'email',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  email: string | null;

  @Column({
    name: 'phone_area_code',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  phoneAreaCode: string | null;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phoneNumber: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;
}
