import fs from 'fs';
import path from 'path';
import { BaseRule } from './BaseRule';
import { Rule, RuleMatch, RuleSeverity, SimpleRule as ISimpleRule } from '@literaryhelper/types';

/**
 * Implementation of a simple rule that uses regex pattern matching
 */
export class SimpleRule extends BaseRule {
  /**
   * The compiled regex pattern
   */
  private regex: RegExp;

  /**
   * Create a new simple rule
   * @param id Unique identifier for the rule
   * @param name Human-readable name
   * @param description Explanation of what the rule checks for
   * @param severity Level of importance ('info', 'warning', 'error')
   * @param pattern Regex pattern as string
   */
  constructor(
    id: string,
    name: string,
    description: string,
    severity: RuleSeverity,
    private pattern: string,
  ) {
    super(id, name, description, 'simple', severity);
    
    try {
      // Compile the regex pattern with global and case-insensitive flags
      this.regex = new RegExp(pattern, 'gi');
    } catch (error) {
      throw new Error(`Invalid regex pattern for rule ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute the rule against the provided text
   * @param text The text to analyze
   * @returns Array of rule matches
   */
  async execute(text: string): Promise<RuleMatch[]> {
    const matches: RuleMatch[] = [];
    
    // Reset the regex to start from the beginning
    this.regex.lastIndex = 0;
    
    // Find all matches
    let match: RegExpExecArray | null;
    while ((match = this.regex.exec(text)) !== null) {
      const matchedText = match[0];
      const start = match.index;
      const end = start + matchedText.length;
      
      // Get the surrounding context
      const context = this.getMatchContext(text, start, end);
      
      // Create a suggestion based on the rule
      const suggestion = this.createSuggestion(matchedText, this.id);
      
      // Create an explanation based on the rule
      const explanation = this.createExplanation(matchedText, this.id, context);
      
      // Add the match
      matches.push(this.createMatch(
        start,
        end,
        matchedText,
        suggestion,
        explanation
      ));
    }
    
    return matches;
  }
  
  /**
   * Create a suggestion for the match based on the rule type
   * @param matchedText The matched text
   * @param ruleId The rule ID
   * @returns A suggestion for improvement
   */
  private createSuggestion(matchedText: string, ruleId: string): string {
    switch (ruleId) {
      case 'passive‑voice':
        return 'Consider using active voice instead.';
      
      case 'adverb‑overuse':
        // Extract the adverb (the word ending in 'ly')
        const adverb = matchedText.match(/\b\w+ly\b/)?.[0] || '';
        return `Consider removing "${adverb}" or using a stronger verb.`;
      
      case 'very‑weakener':
        return 'Remove "very" and use a stronger adjective or adverb.';
      
      default:
        return 'Consider revising this text.';
    }
  }
  
  /**
   * Create an explanation for the match based on the rule type
   * @param matchedText The matched text
   * @param ruleId The rule ID
   * @param context The surrounding context
   * @returns An explanation of the issue
   */
  private createExplanation(matchedText: string, ruleId: string, context: string): string {
    switch (ruleId) {
      case 'passive‑voice':
        return `"${matchedText}" is in passive voice. Active voice is generally more engaging and direct.\nContext: ${context}`;
      
      case 'adverb‑overuse':
        return `Overuse of adverbs can weaken your writing. Try using a stronger verb instead of an adverb + verb combination.\nContext: ${context}`;
      
      case 'very‑weakener':
        return `"Very" is a weak intensifier that often adds little value. Use a stronger, more specific adjective or adverb.\nContext: ${context}`;
      
      default:
        return `This text matches the pattern for "${ruleId}".\nContext: ${context}`;
    }
  }
}

/**
 * Processor for simple rules that use regex pattern matching
 */
export class SimpleRuleProcessor {
  /**
   * The loaded simple rules
   */
  private rules: SimpleRule[] = [];
  
  /**
   * Create a new simple rule processor
   * @param configPath Path to the rules.json file (default: '../../../../config/rules.json')
   */
  constructor(configPath?: string) {
    // Default config path is relative to this file
    const defaultConfigPath = path.resolve(__dirname, '../../../../config/rules.json');
    
    // Load rules from the config file
    this.loadRules(configPath || defaultConfigPath);
  }
  
  /**
   * Load rules from the config file
   * @param configPath Path to the rules.json file
   */
  private loadRules(configPath: string): void {
    try {
      // Read and parse the config file
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const allRules = JSON.parse(configContent.replace(/\/\/.*$/gm, '')) as Rule[];
      
      // Filter for simple rules
      const simpleRules = allRules.filter(rule => rule.type === 'simple') as ISimpleRule[];
      
      // Create SimpleRule instances
      this.rules = simpleRules.map(rule => new SimpleRule(
        rule.id,
        rule.name,
        rule.description,
        rule.severity,
        rule.pattern
      ));
      
      console.log(`Loaded ${this.rules.length} simple rules.`);
    } catch (error) {
      console.error('Failed to load rules:', error instanceof Error ? error.message : String(error));
      // Initialize with empty rules array
      this.rules = [];
    }
  }
  
  /**
   * Get all loaded simple rules
   * @returns Array of SimpleRule instances
   */
  getRules(): SimpleRule[] {
    return this.rules;
  }
  
  /**
   * Process text with all simple rules
   * @param text The text to analyze
   * @returns Array of rule matches from all simple rules
   */
  async processText(text: string): Promise<RuleMatch[]> {
    // Skip processing if text is empty
    if (!text || text.trim().length === 0) {
      return [];
    }
    
    // Process text with each rule and combine matches
    const matchPromises = this.rules.map(rule => rule.safeExecute(text));
    const matchesByRule = await Promise.all(matchPromises);
    
    // Flatten the array of matches
    return matchesByRule.flat();
  }
  
  /**
   * Get a rule by ID
   * @param ruleId The rule ID to find
   * @returns The rule or undefined if not found
   */
  getRule(ruleId: string): SimpleRule | undefined {
    return this.rules.find(rule => rule.id === ruleId);
  }
}
