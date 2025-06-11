"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRule = exports.RuleExecutionError = void 0;
exports.isSimpleRule = isSimpleRule;
exports.isAIRule = isAIRule;
/**
 * Base error class for rule execution errors
 */
class RuleExecutionError extends Error {
    constructor(message, ruleId, cause) {
        super(`Rule ${ruleId} execution error: ${message}${cause ? ` - ${cause.message}` : ''}`);
        this.ruleId = ruleId;
        this.cause = cause;
        this.name = 'RuleExecutionError';
    }
}
exports.RuleExecutionError = RuleExecutionError;
/**
 * Abstract base class for all rule implementations
 */
class BaseRule {
    /**
     * Create a new rule
     * @param id Unique identifier for the rule
     * @param name Human-readable name
     * @param description Explanation of what the rule checks for
     * @param type Rule type ('simple' or 'ai')
     * @param severity Level of importance ('info', 'warning', 'error')
     */
    constructor(id, name, description, type, severity) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.type = type;
        this.severity = severity;
    }
    /**
     * Extract context around a match
     * @param text Full text
     * @param start Start position of match
     * @param end End position of match
     * @param contextSize Number of characters before and after match
     * @returns Text with context
     */
    getMatchContext(text, start, end, contextSize = 50) {
        const contextStart = Math.max(0, start - contextSize);
        const contextEnd = Math.min(text.length, end + contextSize);
        let context = '';
        if (contextStart > 0)
            context += '...';
        context += text.substring(contextStart, start);
        context += `[${text.substring(start, end)}]`;
        context += text.substring(end, contextEnd);
        if (contextEnd < text.length)
            context += '...';
        return context;
    }
    /**
     * Split text into sentences for analysis
     * @param text Text to split
     * @returns Array of sentences
     */
    splitIntoSentences(text) {
        // Simple sentence splitting - can be enhanced with NLP libraries
        return text
            .replace(/([.?!])\s+(?=[A-Z])/g, '$1|')
            .split('|')
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }
    /**
     * Create a rule match object
     * @param start Start position in text
     * @param end End position in text
     * @param text Matched text
     * @param suggestion Optional suggestion for improvement
     * @param explanation Optional explanation of the issue
     * @returns Rule match object
     */
    createMatch(start, end, text, suggestion, explanation) {
        return {
            ruleId: this.id,
            range: {
                start,
                end,
                text
            },
            suggestion,
            explanation,
            severity: this.severity
        };
    }
    /**
     * Execute with error handling wrapper
     * @param text Text to analyze
     * @returns Rule matches or empty array on error
     */
    async safeExecute(text) {
        try {
            return await this.execute(text);
        }
        catch (error) {
            console.error(new RuleExecutionError('Failed to execute rule', this.id, error instanceof Error ? error : new Error(String(error))));
            return [];
        }
    }
}
exports.BaseRule = BaseRule;
/**
 * Type guard to check if a rule is a SimpleRule
 * @param rule Rule to check
 * @returns True if rule is a SimpleRule
 */
function isSimpleRule(rule) {
    return rule.type === 'simple';
}
/**
 * Type guard to check if a rule is an AIRule
 * @param rule Rule to check
 * @returns True if rule is an AIRule
 */
function isAIRule(rule) {
    return rule.type === 'ai';
}
