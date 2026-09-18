/**
 * prisma/applyVectorMigration.ts
 *
 * Applies the raw SQL vector migration that Prisma cannot auto-generate.
 * Run via: npm run migrate
 *   which chains: prisma migrate deploy && tsx prisma/applyVectorMigration.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({ connectionString });
  await client.connect();

  const sqlPath = path.join(__dirname, 'migrations', '00_init_vector', 'migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('Applying vector migration...');
  await client.query(sql);
  console.log('✓ Vector migration applied successfully.');

  await client.end();
}

main().catch((err) => {
  console.error('Vector migration failed:', err);
  process.exit(1);
});
