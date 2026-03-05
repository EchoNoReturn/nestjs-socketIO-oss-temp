import { registerAs } from '@nestjs/config';
import { default as yaml } from 'js-yaml';
import { readFileSync } from 'node:fs';

export const CONFIG_FILE_PATH = 'config/config.yaml';

const validatedPort = (value: string | number) => {
  const port = Number(value);
  if (isNaN(port)) {
    throw new Error('HTTP port must be a number');
  }
  if (port < 1024 || port > 49151) {
    throw new Error('HTTP port must be between 1024 and 49151');
  }
};

export default registerAs('config', () => {
  const config = yaml.load(readFileSync(CONFIG_FILE_PATH, 'utf8')) as Record<
    string,
    any
  >;

  // Validate the HTTP port
  validatedPort(config.port as string | number);

  return config;
});
