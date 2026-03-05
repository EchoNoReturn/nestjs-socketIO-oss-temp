import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isObservable, lastValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';

import { JwtAuthGuard } from './jwt-auth.guard';
import { JUMP_AUTH_KEY } from './decorators/jump-auth.decorator';
import type { JumpAuthOptions } from './decorators/jump-auth.decorator';
import { WsJwtGuard } from './ws-jwt.guard';

type PermissionsCarrier = {
  permissions?: unknown;
};

@Injectable()
export class GlobalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly wsJwtGuard: WsJwtGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<
      JumpAuthOptions | undefined
    >(JUMP_AUTH_KEY, [context.getHandler(), context.getClass()]);

    if (options?.isPublic) {
      return true;
    }

    const type = context.getType<'http' | 'ws' | 'rpc'>();
    const ok =
      type === 'ws'
        ? await this.toPromise(this.wsJwtGuard.canActivate(context))
        : await this.toPromise(this.jwtAuthGuard.canActivate(context));

    if (!ok) {
      return false;
    }

    const requiredPerms = options?.permissions ?? [];
    if (requiredPerms.length === 0) {
      return true;
    }

    const subject: PermissionsCarrier | null =
      type === 'ws'
        ? ((context.switchToWs().getClient<{ data?: unknown }>()?.data as
            | PermissionsCarrier
            | undefined) ?? null)
        : ((context.switchToHttp().getRequest<{ user?: unknown }>()?.user as
            | PermissionsCarrier
            | undefined) ?? null);

    const granted = Array.isArray(subject?.permissions)
      ? (subject?.permissions as unknown[]).filter((p) => typeof p === 'string')
      : [];

    const missing = requiredPerms.filter((p) => !granted.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException('Missing permissions');
    }

    return true;
  }

  private async toPromise(
    value: boolean | Promise<boolean> | Observable<boolean>,
  ): Promise<boolean> {
    if (isObservable(value)) {
      return await lastValueFrom(value);
    }
    return await Promise.resolve(value);
  }
}
