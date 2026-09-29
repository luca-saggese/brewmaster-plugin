/**
 * Shared data-root resolution for the brewmaster plugin.
 *
 * Persistent brewing data is stored below the user's sandbox:
 * `<sandbox>/users/<username>/.brewing-data`.
 *
 * Never fall back to a process-global directory. A missing user context is an
 * error because a fallback would silently merge different users' data.
 */

import { basename, dirname, join, resolve } from 'node:path';

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

function userSession(args: unknown): UserSessionArg | undefined {
  if (args === null || typeof args !== 'object') return undefined;
  const user = (args as Record<string, unknown>)['_kimi_user'];
  if (user === null || typeof user !== 'object') return undefined;
  return user as UserSessionArg;
}

function safeUserName(user: UserSessionArg): string | undefined {
  const raw = user.username ?? user.userId;
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const name = raw.trim().replace(/[^a-zA-Z0-9._-]+/g, '_');
  return name && name !== '.' && name !== '..' ? name : undefined;
}

/** Stable key used for other per-user in-memory state. */
export function userScopeKey(args: unknown): string {
  const user = userSession(args);
  const chroot = userChroot(args);
  const name = user ? safeUserName(user) : undefined;
  if (!chroot || !name) {
    throw new Error('Contesto utente mancante: impossibile determinare la sandbox users/<nome-utente>.');
  }
  return `${chroot}:${name}`;
}

export function dataRoot(args: unknown): string {
  const user = userSession(args);
  const chroot = userChroot(args);
  const name = user ? safeUserName(user) : undefined;
  if (!chroot || !name) {
    throw new Error('Contesto utente mancante: i dati devono essere salvati in users/<nome-utente>.');
  }

  // Accept both the sandbox root and a chroot already pointing at
  // users/<name>, which keeps compatibility with callers using either form.
  const userDir = basename(dirname(resolve(chroot))) === 'users' && basename(resolve(chroot)) === name
    ? resolve(chroot)
    : join(resolve(chroot), 'users', name);
  return join(userDir, '.brewing-data');
}
