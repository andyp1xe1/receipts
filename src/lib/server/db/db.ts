import { drizzle } from 'drizzle-orm/d1';
import { appSchema } from './schema';

export function requireDbBinding(platform: App.Platform | undefined): D1Database {
  const db = platform?.env.DB;
  if (!db) {
    throw new Error('Cloudflare D1 binding is not available');
  }

  return db;
}

export function getDb(platform: App.Platform | undefined) {
  return drizzle(requireDbBinding(platform), { schema: appSchema });
}
