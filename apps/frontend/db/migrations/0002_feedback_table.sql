-- Migration: Create analysis_feedback table
-- Description: Stores user feedback on analysis results for future model fine-tuning

CREATE TABLE IF NOT EXISTS analysis_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    rule_id VARCHAR(100) NOT NULL,
    match_id VARCHAR(100) NOT NULL,
    helpful BOOLEAN NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX idx_feedback_user_id ON analysis_feedback(user_id);
CREATE INDEX idx_feedback_rule_id ON analysis_feedback(rule_id);
CREATE INDEX idx_feedback_created_at ON analysis_feedback(created_at);

-- Compound index for user + rule combination lookups
CREATE INDEX idx_feedback_user_rule ON analysis_feedback(user_id, rule_id);

-- Comment explaining the purpose of this table
COMMENT ON TABLE analysis_feedback IS 'Stores user feedback on analysis suggestions for improving rule quality';
