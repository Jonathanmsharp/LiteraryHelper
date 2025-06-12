import fs from 'fs';
import path from 'path';
import { BaseRule, RuleExecutionError } from './BaseRule';
import { Rule, RuleMatch, RuleSeverity, AIRule as IAIRule } from '@literaryhelper/types';

/**
 * Configuration for AI providers and models
 */
interface AIConfig {
  provider: string;
  model: string;
  apiKey?: string;
}

/**
 * Implementation of an AI-powered rule
 */
export class AIRule extends BaseRule {
  /**
   * Create a new AI rule
   */
  constructor(
    id: string,
    name: string,
    description: string,
    severity: RuleSeverity,
    private promptTemplate: string,
    private model: string = 'gpt-4o',
    private provider: string = 'openai',
  ) {
    super(id, name, description, 'ai', severity);
  }

  /**
   * Execute the AI rule against the provided text
   */
  async execute(text: string): Promise<RuleMatch[]> {
    try {
      // For now, simulate AI processing with pattern matching
      // In a real implementation, this would call the OpenAI API
      console.log(`[AIRule] Processing rule ${this.id} with ${this.provider}:${this.model}`);
      
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Return empty matches for now - will implement actual AI in Step 16-17
      return [];
    } catch (error) {
      throw new RuleExecutionError(
        'Failed to execute AI rule',
        this.id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

/**
 * Processor for AI rules
 */
export class AIRuleProcessor {
  /**
   * The loaded AI rules
   */
  private rules: AIRule[] = [];

  /**
   * Create a new AI rule processor
   */
  constructor(configPath?: string) {
    const defaultConfigPath = path.resolve(__dirname, '../../../../config/rules.json');
    this.loadRules(configPath || defaultConfigPath);
  }

  /**
   * Load rules from the config file
   */
  private loadRules(configPath: string): void {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const allRules = JSON.parse(configContent.replace(/\/\/.*$/gm, '')) as Rule[];

      const aiRules = allRules.filter(rule => rule.type === 'ai') as IAIRule[];

      this.rules = aiRules.map(rule => new AIRule(
        rule.id,
        rule.name,
        rule.description,
        rule.severity,
        rule.promptTemplate,
        rule.model,
        rule.provider,
      ));

      console.log(`Loaded ${this.rules.length} AI rules.`);
    } catch (error) {
      console.error('Failed to load AI rules:', error instanceof Error ? error.message : String(error));
      this.rules = [];
    }
  }

  /**
   * Get all loaded AI rules
   */
  getRules(): AIRule[] {
    return this.rules;
  }

  /**
   * Process text with all AI rules
   */
  async processText(text: string): Promise<RuleMatch[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const matchPromises = this.rules.map(rule => rule.safeExecute(text));
    const matchesByRule = await Promise.all(matchPromises);

    return matchesByRule.flat();
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): AIRule | undefined {
    return this.rules.find(rule => rule.id === ruleId);
  }
}
