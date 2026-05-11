import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from './db';
import { users } from './schema';

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: number | null;
  createdAt: number;
}

function mapRow(row: typeof users.$inferSelect): AdminUserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    banned: row.banned ?? false,
    banReason: row.banReason ?? null,
    banExpires: row.banExpires ? row.banExpires.getTime() : null,
    createdAt: row.createdAt.getTime()
  };
}

export async function listUsers(
  platform: App.Platform | undefined,
  page: { limit: number; skip: number }
): Promise<{ items: AdminUserRecord[]; total: number }> {
  const db = getDb(platform);
  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(page.limit)
      .offset(page.skip)
      .all(),
    db.select({ value: sql<number>`count(*)` }).from(users).get()
  ]);

  return {
    items: rows.map(mapRow),
    total: Number(totalRow?.value ?? 0)
  };
}

export async function getUserById(
  platform: App.Platform | undefined,
  id: string
): Promise<AdminUserRecord | null> {
  const row = await getDb(platform).select().from(users).where(eq(users.id, id)).get();
  return row ? mapRow(row) : null;
}

export async function banUser(
  platform: App.Platform | undefined,
  id: string,
  reason: string | null,
  expiresAt: Date | null
): Promise<void> {
  await getDb(platform)
    .update(users)
    .set({ banned: true, banReason: reason, banExpires: expiresAt, updatedAt: new Date() })
    .where(eq(users.id, id));
}

export async function unbanUser(platform: App.Platform | undefined, id: string): Promise<void> {
  await getDb(platform)
    .update(users)
    .set({ banned: false, banReason: null, banExpires: null, updatedAt: new Date() })
    .where(eq(users.id, id));
}
