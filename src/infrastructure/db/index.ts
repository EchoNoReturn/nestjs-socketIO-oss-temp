export const CONFIG_TAG = 'config.db';

export interface DBConfig {
  type: 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mongodb';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize?: boolean;
}
