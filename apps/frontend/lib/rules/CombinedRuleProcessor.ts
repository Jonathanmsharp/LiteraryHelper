import { SimpleRuleProcessor, RuleMatch } from './SimpleRuleProcessor';
import { AIRuleProcessor } from './AIRuleProcessor';

/**
 * Combined processor that handles both simple and AI rules
 */
export class CombinedRuleProcessor {
  private simpleProcessor: SimpleRuleProcessor;
  private aiProcessor: AIRuleProcessor;

  constructor(configPath?: string) {
    this.simpleProcessor = new SimpleRuleProcessor(configPath);
    this.aiProcessor = new AIRuleProcessor(configPath);
  }

  /**
   * Process text with all rules (simple and AI)
   * @param text The text to analyze
   * @returns Array of rule matches from all rules
   */
  async processText(text: string): Promise<RuleMatch[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Process with both simple and AI rules in parallel
    const [simpleMatches, aiMatches] = await Promise.all([
      this.simpleProcessor.processText(text),
      this.aiProcessor.processText(text)
    ]);

    // Combine and return all matches
    return [...simpleMatches, ...aiMatches];
  }

  /**
   * Get all simple rules
   */
  getSimpleRules() {
    return this.simpleProcessor.getRules();
  }

  /**
   * Get all AI rules
   */
  getAIRules() {
    return this.aiProcessor.getRules();
  }

  /**
   * Get a simple rule by ID
   */
  getSimpleRule(ruleId: string) {
    return this.simpleProcessor.getRule(ruleId);
  }

  /**
   * Get an AI rule by ID
   */
  getAIRule(ruleId: string) {
    return this.aiProcessor.getRule(ruleId);
  }
}
