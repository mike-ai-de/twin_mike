-- Initialize pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for vector similarity search (will be used after embeddings are populated)
-- Note: This will be run after migrations, as the table needs to exist first
