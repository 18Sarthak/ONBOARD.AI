import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { embed } from './embed';
import { prisma } from '../db/prismaClient';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  return new Pool({ connectionString });
}

// ---------------------------------------------------------------------------
// Simple sentence-aware chunker.
// Splits text on double-newlines first (paragraphs), then on sentence
// boundaries if a paragraph exceeds the token budget.
// "~500 tokens" ≈ ~400 words for English prose.
// ---------------------------------------------------------------------------
const CHUNK_WORD_LIMIT = 400;

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const combined = current ? `${current}\n\n${para}` : para;
    const wordCount = combined.split(/\s+/).length;

    if (wordCount > CHUNK_WORD_LIMIT && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = combined;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter((c) => c.length > 0);
}

// ---------------------------------------------------------------------------
// Main ingestion logic
// ---------------------------------------------------------------------------
async function ingestFile(filePath: string): Promise<void> {
  const sourceDoc = path.basename(filePath);
  console.log(`\nIngesting: ${sourceDoc}`);

  const text = fs.readFileSync(filePath, 'utf-8');
  const chunks = chunkText(text);
  console.log(`  → ${chunks.length} chunks`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    process.stdout.write(`  Embedding chunk ${i + 1}/${chunks.length}…`);

    const embeddingArray = await embed(chunk);
    const vectorLiteral = `[${embeddingArray.join(',')}]`;

    // Insert the chunk row via Prisma (without embedding), then update the
    // embedding column via raw SQL through the Neon pool (pgvector type).
    const created = await prisma.policyChunk.create({
      data: { content: chunk, sourceDoc },
    });

    const pool = getPool();
    await pool.query(
      `UPDATE "PolicyChunk" SET embedding = $1::vector WHERE id = $2`,
      [vectorLiteral, created.id]
    );
    await pool.end();

    process.stdout.write(' ✓\n');
  }
}

async function main(): Promise<void> {
  const policiesDir = path.join(__dirname, '..', 'data', 'policies');

  if (!fs.existsSync(policiesDir)) {
    console.error(`Policies directory not found: ${policiesDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(policiesDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(policiesDir, f));

  if (files.length === 0) {
    console.error('No .md files found in policies directory.');
    process.exit(1);
  }

  console.log(`Found ${files.length} policy file(s). Starting ingestion…`);

  // Clear existing chunks so re-running is idempotent
  const deleted = await prisma.policyChunk.deleteMany({});
  if (deleted.count > 0) {
    console.log(`Cleared ${deleted.count} existing PolicyChunk rows.`);
  }

  for (const file of files) {
    await ingestFile(file);
  }

  const total = await prisma.policyChunk.count();
  console.log(`\n✓ Ingestion complete. Total PolicyChunk rows: ${total}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  prisma.$disconnect().finally(() => process.exit(1));
});
