import { count, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db/db';
import { users } from '$lib/server/db/schema';

function isMissingTableError(error: unknown): boolean {
  return error instanceof Error && /no such table/i.test(error.message);
}

export async function authTablesReady(platform: App.Platform | undefined): Promise<boolean> {
  if (!platform?.env.DB) return false;

  try {
    const result = await getDb(platform).get<{ count: number }>(sql`
      SELECT COUNT(*) as count
      FROM sqlite_master
      WHERE type = 'table' AND name IN ('user', 'session', 'account', 'verification', 'twoFactor')
    `);

    return (result?.count ?? 0) === 5;
  } catch {
    return false;
  }
}

export async function countAuthUsers(platform: App.Platform | undefined): Promise<number> {
  if (!platform?.env.DB) return 0;

  try {
    const result = await getDb(platform).select({ count: count() }).from(users).get();
    return result?.count ?? 0;
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}
