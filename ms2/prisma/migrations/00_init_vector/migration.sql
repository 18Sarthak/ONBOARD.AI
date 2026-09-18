-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add the embedding column to PolicyChunk if it does not already exist.
-- This runs AFTER the Prisma migration that creates the PolicyChunk table.
-- Prisma cannot generate vector(384) natively, so we manage this column manually.
ALTER TABLE "PolicyChunk"
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Create an IVFFlat index for approximate nearest-neighbour search.
-- Lists=100 is a reasonable default for a few thousand policy chunks.
-- Rebuild with a higher value if the dataset grows significantly.
CREATE INDEX IF NOT EXISTS policy_chunk_embedding_idx
  ON "PolicyChunk"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
