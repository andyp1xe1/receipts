import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const receipts = sqliteTable(
  'receipts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    sourceUrl: text('source_url').notNull(),
    eccId: text('ecc_id').notNull(),
    urlTotal: text('url_total').notNull(),
    urlReceiptNumber: text('url_receipt_number').notNull(),
    urlDate: text('url_date').notNull(),
    merchantName: text('merchant_name').notNull(),
    merchantTaxId: text('merchant_tax_id'),
    issuedAt: text('issued_at'),
    total: text('total').notNull(),
    category: text('category'),
    note: text('note'),
    rawJson: text('raw_json').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('receipts_canonical_key_idx').on(
      table.userId,
      table.eccId,
      table.urlTotal,
      table.urlReceiptNumber,
      table.urlDate
    ),
    index('receipts_user_id_idx').on(table.userId),
    index('receipts_created_at_idx').on(table.createdAt),
    index('receipts_url_date_idx').on(table.urlDate),
    index('receipts_category_idx').on(table.category)
  ]
);

export const users = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  twoFactorEnabled: integer('twoFactorEnabled', { mode: 'boolean' }).default(false),
  role: text('role').notNull().default('USER'),
  banned: integer('banned', { mode: 'boolean' }).default(false),
  banReason: text('banReason'),
  banExpires: integer('banExpires', { mode: 'timestamp_ms' })
});

export const sessions = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
  },
  (table) => [index('session_userId_idx').on(table.userId)]
);

export const accounts = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [index('account_userId_idx').on(table.userId)]
);

export const verifications = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const twoFactors = sqliteTable(
  'twoFactor',
  {
    id: text('id').primaryKey(),
    secret: text('secret').notNull(),
    backupCodes: text('backupCodes').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
  },
  (table) => [index('twoFactor_secret_idx').on(table.secret), index('twoFactor_userId_idx').on(table.userId)]
);

export const authSchema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
  twoFactor: twoFactors
};

export const appSchema = {
  receipts,
  ...authSchema
};

export const nonEmptyCategoryExpr = sql<string>`coalesce(nullif(${receipts.category}, ''), 'Unsorted')`;
