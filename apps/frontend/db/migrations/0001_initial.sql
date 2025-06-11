-- CreateEnums
CREATE TYPE "severity" AS ENUM ('info', 'warning', 'error');
CREATE TYPE "rule_type" AS ENUM ('simple', 'ai');
CREATE TYPE "analysis_status" AS ENUM ('pending', 'processing', 'completed', 'error');

-- CreateTable: rules
CREATE TABLE "rules" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT NOT NULL,
  "type" rule_type NOT NULL,
  "severity" severity NOT NULL,
  "pattern" TEXT,
  "prompt_template" TEXT,
  "model" VARCHAR(50),
  "provider" VARCHAR(50),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CreateTable: users
CREATE TABLE "users" (
  "id" VARCHAR(64) PRIMARY KEY,
  "email" VARCHAR(255) UNIQUE,
  "name" VARCHAR(100),
  "preferences" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CreateTable: analyses
CREATE TABLE "analyses" (
  "id" SERIAL PRIMARY KEY,
  "user_id" VARCHAR(64) REFERENCES "users"("id") ON DELETE SET NULL,
  "session_id" VARCHAR(128),
  "text" TEXT NOT NULL,
  "text_hash" VARCHAR(64) NOT NULL,
  "status" analysis_status NOT NULL DEFAULT 'pending',
  "progress" INTEGER DEFAULT 0,
  "results" JSONB DEFAULT '[]',
  "error" TEXT,
  "processing_time_ms" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CreateIndex: text_hash for caching
CREATE INDEX "analyses_text_hash_idx" ON "analyses"("text_hash");

-- CreateTable: analysis_rule_results
CREATE TABLE "analysis_rule_results" (
  "id" SERIAL PRIMARY KEY,
  "analysis_id" INTEGER NOT NULL REFERENCES "analyses"("id") ON DELETE CASCADE,
  "rule_id" VARCHAR(64) NOT NULL REFERENCES "rules"("id") ON DELETE CASCADE,
  "matches" JSONB DEFAULT '[]',
  "processing_time_ms" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CreateTable: feedback
CREATE TABLE "feedback" (
  "id" SERIAL PRIMARY KEY,
  "user_id" VARCHAR(64) REFERENCES "users"("id") ON DELETE SET NULL,
  "analysis_id" INTEGER NOT NULL REFERENCES "analyses"("id") ON DELETE CASCADE,
  "rule_id" VARCHAR(64) NOT NULL REFERENCES "rules"("id") ON DELETE CASCADE,
  "match_id" VARCHAR(64),
  "helpful" BOOLEAN NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CreateIndexes for performance
CREATE INDEX "analysis_rule_results_analysis_id_idx" ON "analysis_rule_results"("analysis_id");
CREATE INDEX "analysis_rule_results_rule_id_idx" ON "analysis_rule_results"("rule_id");
CREATE INDEX "feedback_analysis_id_idx" ON "feedback"("analysis_id");
CREATE INDEX "feedback_rule_id_idx" ON "feedback"("rule_id");
CREATE INDEX "feedback_user_id_idx" ON "feedback"("user_id");

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tables with updated_at column
CREATE TRIGGER update_rules_timestamp
BEFORE UPDATE ON "rules"
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_analyses_timestamp
BEFORE UPDATE ON "analyses"
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();
