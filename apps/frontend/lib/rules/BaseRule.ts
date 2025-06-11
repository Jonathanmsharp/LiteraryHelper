import { BaseRule as IBaseRule, Rule, RuleMatch, RuleSeverity, SimpleRule as ISimpleRule, AIRule as IAIRule } from '@literaryhelper/types';

/**
 * Base error class for rule execution errors
 */
export class RuleExecutionError extends Error {
  constructor(
    message: string,
    public ruleId: string,
    public cause?: Error
  ) {
    super(`Rule ${ruleId} execution error: ${message}${cause ? ` - ${cause.message}` : ''}`);
    this.name = 'RuleExecutionError';
  }
}

/**
 * Abstract base class for all rule implementations
 */
export abstract class BaseRule implements IBaseRule {
  /**
   * Create a new rule
   * @param id Unique identifier for the rule
   * @param name Human-readable name
   * @param description Explanation of what the rule checks for
   * @param type Rule type ('simple' or 'ai')
   * @param severity Level of importance ('info', 'warning', 'error')
   */
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly type: 'simple' | 'ai',
    public readonly severity: RuleSeverity
  ) {}

  /**
   * Execute the rule against the provided text
   * @param text The text to analyze
   * @returns Array of rule matches
   */
  abstract execute(text: string): Promise<RuleMatch[]>;

  /**
   * Extract context around a match
   * @param text Full text
   * @param start Start position of match
   * @param end End position of match
   * @param contextSize Number of characters before and after match
   * @returns Text with context
   */
  protected getMatchContext(text: string, start: number, end: number, contextSize = 50): string {
    const contextStart = Math.max(0, start - contextSize);
    const contextEnd = Math.min(text.length, end + contextSize);
    
    let context = '';
    if (contextStart > 0) context += '...';
    context += text.substring(contextStart, start);
    context += `[${text.substring(start, end)}]`;
    context += text.substring(end, contextEnd);
    if (contextEnd < text.length) context += '...';
    
    return context;
  }

  /**
   * Split text into sentences for analysis
   * @param text Text to split
   * @returns Array of sentences
   */
  protected splitIntoSentences(text: string): string[] {
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
  protected createMatch(
    start: number,
    end: number,
    text: string,
    suggestion?: string,
    explanation?: string
  ): RuleMatch {
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
  async safeExecute(text: string): Promise<RuleMatch[]> {
    try {
      return await this.execute(text);
    } catch (error) {
      console.error(new RuleExecutionError(
        'Failed to execute rule',
        this.id,
        error instanceof Error ? error : new Error(String(error))
      ));
      return [];
    }
  }
}

/**
 * Type guard to check if a rule is a SimpleRule
 * @param rule Rule to check
 * @returns True if rule is a SimpleRule
 */
export function isSimpleRule(rule: Rule): rule is ISimpleRule {
  return rule.type === 'simple';
}

/**
 * Type guard to check if a rule is an AIRule
 * @param rule Rule to check
 * @returns True if rule is an AIRule
 */
export function isAIRule(rule: Rule): rule is IAIRule {
  return rule.type === 'ai';
}
