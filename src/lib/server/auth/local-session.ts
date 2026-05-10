import type { Cookies } from '@sveltejs/kit';

export const LOCAL_SESSION_COOKIE = 'local_session';

export function hasLocalSession(cookies: Cookies): boolean {
  return cookies.get(LOCAL_SESSION_COOKIE) === '1';
}

export function clearLocalSession(cookies: Cookies): void {
  cookies.delete(LOCAL_SESSION_COOKIE, { path: '/' });
}
