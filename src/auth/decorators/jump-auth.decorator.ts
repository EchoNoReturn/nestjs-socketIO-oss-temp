import { SetMetadata } from '@nestjs/common';

export const JUMP_AUTH_KEY = 'jump_auth';

export interface JumpAuthOptions {
  isPublic: boolean;
  permissions: string[];
}

/**
 * Override global auth behavior.
 *
 * - `@JumpAuth()` => public endpoint (no auth)
 * - `@JumpAuth(['perm:a', 'perm:b'])` => requires auth + permissions
 * - Omit decorator => requires auth (default)
 */
export function JumpAuth(
  permissions?: string[],
): MethodDecorator & ClassDecorator {
  const perms = Array.isArray(permissions) ? permissions : [];
  const options: JumpAuthOptions = {
    isPublic: perms.length === 0,
    permissions: perms,
  };

  return SetMetadata(JUMP_AUTH_KEY, options);
}
