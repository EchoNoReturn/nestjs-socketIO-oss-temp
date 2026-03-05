export interface JwtRuntimeConfig {
  secret: string;
  expiresInRaw: string;
  expiresInSeconds: number;
}

export function parseJwtExpiresInSeconds(value: string): number {
  const raw = value.trim();
  if (!raw) {
    throw new Error('JWT_EXPIRES_IN is empty');
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error(
      'JWT_EXPIRES_IN must be seconds (e.g. 3600) or a duration like 15m/1h/7d',
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factor =
    unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return amount * factor;
}

export function getJwtRuntimeConfig(
  get: (key: string) => unknown,
): JwtRuntimeConfig {
  const secretEnv = process.env.JWT_SECRET;
  const secretYaml = get('config.auth.jwtSecret');
  const secret =
    (typeof secretEnv === 'string' && secretEnv.trim()) ||
    (typeof secretYaml === 'string' && secretYaml.trim()) ||
    '';

  if (!secret) {
    throw new Error(
      'JWT secret is missing (set env JWT_SECRET or config.auth.jwtSecret)',
    );
  }

  const expiresInEnv = process.env.JWT_EXPIRES_IN;
  const expiresInYaml = get('config.auth.jwtExpiresIn');
  const expiresInRaw =
    (typeof expiresInEnv === 'string' && expiresInEnv.trim()) ||
    (typeof expiresInYaml === 'string' && expiresInYaml.trim()) ||
    '1h';

  const expiresInSeconds = parseJwtExpiresInSeconds(expiresInRaw);

  return {
    secret,
    expiresInRaw,
    expiresInSeconds,
  };
}

export function toRedisTtlSeconds(seconds: number): number {
  // Add a small buffer so the Redis session doesn't expire earlier than JWT.
  return Math.max(1, seconds + 10);
}
