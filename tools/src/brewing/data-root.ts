/**
 * Shared data-root resolution for the brewmaster plugin.
 *
 * Persistent brewing data (memory, inventory, brewday logs) is stored per-user
 * inside the connected user's chroot under `.brewing-data`, so a multi-user
 * server keeps each user's data separate. When no user is attached to the tool
 * call (e.g. running outside the kap-server), it falls back to the legacy
 * `~/.kimi-code/brewing` location.
 */

import { join } from 'node:path';
import { homedir } from 'node:os';

export interface UserSessionArg {
  readonly userId?: string;
  readonly username?: string;
  readonly chroot?: string;
  readonly token?: string;
}

export function userChroot(args: unknown): string | undefined {
  if (args === null || typeof args !== 'object') return undefined;
  const record = args as Record<string, unknown>;
  const user = record['_kimi_user'];
  if (user === null || typeof user !== 'object') return undefined;
  const chroot = (user as Record<string, unknown>)['chroot'];
  return typeof chroot === 'string' && chroot.length > 0 ? chroot : undefined;
}

export function dataRoot(args: unknown): string {
  const chroot = userChroot(args);
  if (chroot !== undefined) return join(chroot, '.brewing-data');
  return join(homedir(), '.kimi-code', 'brewing');
}
