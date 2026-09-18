/**
 * src/rag/embed.ts
 *
 * Singleton embedding pipeline using Xenova/all-MiniLM-L6-v2 (ONNX, local CPU).
 * Shared between ingest.ts (batch embedding) and retrieve.ts (query embedding).
 *
 * Sharp is mocked at startup (in server.ts / ingest.ts entry point) so that
 * @xenova/transformers can load without its native image-processing binary.
 * Text embeddings use only the ONNX runtime — sharp is not needed.
 */
import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';

let embeddingPipeline: FeatureExtractionPipeline | null = null;

async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipeline) {
    console.log('Loading embedding model (Xenova/all-MiniLM-L6-v2)…');
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('✓ Embedding model loaded.');
  }
  return embeddingPipeline;
}

/**
 * Produces a 384-dimensional embedding vector for the given text.
 * Uses mean pooling + L2 normalisation (cosine-similarity-ready).
 */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}
