/**
 * Core type definitions for LiteraryHelper
 */
/**
 * Severity levels for rule violations
 */
export type RuleSeverity = 'info' | 'warning' | 'error';
/**
 * Rule processing types
 */
export type RuleType = 'simple' | 'ai';
/**
 * Base interface for all rules
 */
export interface BaseRule {
    id: string;
    name: string;
    description: string;
    type: RuleType;
    severity: RuleSeverity;
}
/**
 * Simple rule using regex pattern matching
 */
export interface SimpleRule extends BaseRule {
    type: 'simple';
    pattern: string;
}
/**
 * AI-powered rule using prompt templates
 */
export interface AIRule extends BaseRule {
    type: 'ai';
    promptTemplate: string;
    model?: string;
    provider?: string;
}
/**
 * Union type for all rule types
 */
export type Rule = SimpleRule | AIRule;
/**
 * Text range for a rule match
 */
export interface TextRange {
    start: number;
    end: number;
    text: string;
}
/**
 * Single match result from a rule
 */
export interface RuleMatch {
    ruleId: string;
    range: TextRange;
    suggestion?: string;
    explanation?: string;
    severity: RuleSeverity;
}
/**
 * Request to analyze text
 */
export interface AnalysisRequest {
    text: string;
    userId?: string;
    sessionId?: string;
    options?: {
        rules?: string[];
        maxSeverity?: RuleSeverity;
        includeContext?: boolean;
    };
}
/**
 * Result for a single rule
 */
export interface RuleResult {
    ruleId: string;
    ruleName: string;
    matches: RuleMatch[];
    processingTimeMs: number;
}
/**
 * Complete analysis result
 */
export interface AnalysisResult {
    id: string;
    timestamp: string;
    text: string;
    textHash: string;
    userId?: string;
    sessionId?: string;
    results: RuleResult[];
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress?: number;
    processingTimeMs: number;
    error?: string;
}
/**
 * User information
 */
export interface User {
    id: string;
    email?: string;
    name?: string;
    preferences?: {
        enabledRules?: string[];
        defaultSeverity?: RuleSeverity;
    };
    createdAt: string;
    updatedAt: string;
}
/**
 * User feedback on rule results
 */
export interface Feedback {
    id: string;
    userId: string;
    analysisId: string;
    ruleId: string;
    matchId?: string;
    helpful: boolean;
    notes?: string;
    createdAt: string;
}
/**
 * Job status for analysis queue
 */
export interface AnalysisJob {
    id: string;
    status: 'queued' | 'active' | 'completed' | 'failed';
    progress: number;
    result?: AnalysisResult;
    error?: string;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=index.d.ts.map