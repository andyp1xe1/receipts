export const LOCAL_SESSION_COOKIE = 'local_session';
const ONE_YEAR = 60 * 60 * 24 * 365;

export function startLocalSession(): void {
  const secure = location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${LOCAL_SESSION_COOKIE}=1; path=/; max-age=${ONE_YEAR}; samesite=lax${secure}`;
}

export function endLocalSession(): void {
  document.cookie = `${LOCAL_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function hasLocalSession(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((entry) => entry === `${LOCAL_SESSION_COOKIE}=1`);
}
