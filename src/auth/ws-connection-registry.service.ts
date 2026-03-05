import { Injectable } from '@nestjs/common';
import type { Socket } from 'socket.io';

type AnySocket = Socket<any, any, any, unknown>;

@Injectable()
export class WsConnectionRegistryService {
  private readonly socketsByUserId = new Map<string, Set<AnySocket>>();

  register(userId: string, socket: AnySocket): void {
    let set = this.socketsByUserId.get(userId);
    if (!set) {
      set = new Set<AnySocket>();
      this.socketsByUserId.set(userId, set);
    }
    set.add(socket);
  }

  unregister(socket: AnySocket): void {
    for (const [userId, set] of this.socketsByUserId.entries()) {
      if (set.delete(socket)) {
        if (set.size === 0) {
          this.socketsByUserId.delete(userId);
        }
        break;
      }
    }
  }

  disconnectUser(
    userId: string,
    reason: string = 'logged_in_elsewhere',
    opts?: { exceptSid?: string },
  ): void {
    const set = this.socketsByUserId.get(userId);
    if (!set || set.size === 0) {
      return;
    }

    for (const socket of set) {
      const shouldSkip =
        typeof opts?.exceptSid === 'string' &&
        this.getSocketSid(socket) === opts.exceptSid;
      if (shouldSkip) {
        continue;
      }

      try {
        socket.emit('force_logout', { reason });
      } catch {
        // ignore
      }
      try {
        socket.disconnect(true);
      } catch {
        // ignore
      }
    }

    if (opts?.exceptSid) {
      for (const socket of set) {
        const sid = this.getSocketSid(socket);
        if (sid !== opts.exceptSid) {
          set.delete(socket);
        }
      }
      if (set.size === 0) {
        this.socketsByUserId.delete(userId);
      }
    } else {
      this.socketsByUserId.delete(userId);
    }
  }

  private getSocketSid(socket: AnySocket): string | null {
    const data = socket.data;
    if (!data || typeof data !== 'object') {
      return null;
    }
    const sid = (data as { sid?: unknown }).sid;
    return typeof sid === 'string' ? sid : null;
  }
}
