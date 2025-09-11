import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { BaseRule, RuleExecutionError } from './BaseRule';

// ---------------------------------------------------------------------------
// Inline type definitions (avoids monorepo workspace dependency)
// ---------------------------------------------------------------------------
export type RuleSeverity = 'info' | 'warning' | 'error';
export type RuleType = 'simple' | 'ai';

export interface BaseRuleInterface {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  severity: RuleSeverity;
}

// Using IAIRule to avoid conflict with the class name
export interface IAIRule extends BaseRuleInterface {
  type: 'ai';
  promptTemplate: string;
  model?: string;
  provider?: string;
}

export interface TextRange {
  start: number;
  end: number;
  text: string;
}

export interface RuleMatch {
  ruleId: string;
  range: TextRange;
  suggestion?: string;
  explanation?: string;
  severity: RuleSeverity;
}

export type Rule = IAIRule; // For this processor we only deal with AI rules

/**
 * Configuration for AI providers and models
 */
interface AIConfig {
  provider: string;
  model: string;
  apiKey?: string;
  timeout?: number;
  temperature?: number;
}

/**
 * AI Response format expected from the API
 */
interface AIMatch {
  sentence?: string;
  term?: string;
  start: number;
  end: number;
  reason: string;
  suggestion?: string;
  alternative?: string;
}

/**
 * AI Service for handling API calls to different providers
 */
class AIService {
  private openai: OpenAI | null = null;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    
    if (config.provider === 'openai' && config.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.apiKey,
      });
    }
  }

  /**
   * Call AI provider with prompt and text
   */
  async callAI(prompt: string, text: string, model: string): Promise<AIMatch[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - missing API key');
    }

    const fullPrompt = prompt.replace('{{document}}', text);
    
    try {
      // Create a timeout promise
      const timeoutMs = this.config.timeout || 30000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      // Race between the API call and timeout
      const response = await Promise.race([
        this.openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
          temperature: this.config.temperature || 0.2,
          max_tokens: 4000,
        }),
        timeoutPromise
      ]);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn('[AIService] Empty response from AI provider');
        return [];
      }

      // Parse JSON response
      try {
        const matches = JSON.parse(content.trim());
        if (!Array.isArray(matches)) {
          console.warn('[AIService] AI response is not an array:', content);
          return [];
        }
        return matches;
      } catch (parseError) {
        console.error('[AIService] Failed to parse AI response as JSON:', content);
        throw new Error(`AI returned invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        // Handle different types of OpenAI errors
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          throw new Error(`AI request timed out after ${this.config.timeout || 30000}ms`);
        } else if (error.message.includes('rate limit')) {
          throw new Error('AI rate limit exceeded - please try again later');
        } else if (error.message.includes('insufficient_quota')) {
          throw new Error('AI quota exceeded - please check your OpenAI billing');
        } else if (error.message.includes('invalid_api_key')) {
          throw new Error('Invalid OpenAI API key');
        }
      }
      throw error;
    }
  }
}

/**
 * Implementation of an AI-powered rule
 */
export class AIRule extends BaseRule {
  private promptTemplate: string;
  private model: string;
  private provider: string;
  private aiService: AIService | null = null;
  private maxRetries: number = 2;

  /**
   * Create a new AI rule
   */
  constructor(
    id: string,
    name: string,
    description: string,
    severity: RuleSeverity,
    promptTemplate: string,
    model: string = 'gpt-4o',
    provider: string = 'openai',
  ) {
    super(id, name, description, 'ai', severity);
    this.promptTemplate = promptTemplate;
    this.model = model;
    this.provider = provider;
    
    this.initializeAIService();
  }

  /**
   * Initialize AI service with configuration
   */
  private initializeAIService(): void {
    try {
      const config: AIConfig = {
        provider: this.provider,
        model: this.model,
        apiKey: process.env.OPENAI_API_KEY,
        timeout: parseInt(process.env.AI_RULE_TIMEOUT_MS || '30000'),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.2'),
      };

      if (!config.apiKey) {
        console.warn(`[AIRule] No API key found for provider ${this.provider}`);
        return;
      }

      this.aiService = new AIService(config);
    } catch (error) {
      console.error(`[AIRule] Failed to initialize AI service for rule ${this.id}:`, error);
    }
  }

  /**
   * Convert AI match to RuleMatch format
   */
  private convertAIMatchToRuleMatch(aiMatch: AIMatch): RuleMatch {
    // Calculate text from positions
    const matchText = aiMatch.sentence || aiMatch.term || '';
    
    return {
      ruleId: this.id,
      range: {
        start: aiMatch.start,
        end: aiMatch.end,
        text: matchText,
      },
      suggestion: aiMatch.suggestion || aiMatch.alternative,
      explanation: aiMatch.reason,
      severity: this.severity,
    };
  }

  /**
   * Validate AI match has required fields
   */
  private validateAIMatch(match: any): match is AIMatch {
    return (
      typeof match === 'object' &&
      match !== null &&
      typeof match.start === 'number' &&
      typeof match.end === 'number' &&
      typeof match.reason === 'string' &&
      match.start >= 0 &&
      match.end > match.start
    );
  }

  /**
   * Execute the AI rule against the provided text with retry logic
   */
  async execute(text: string): Promise<RuleMatch[]> {
    if (!this.aiService) {
      console.warn(`[AIRule] AI service not available for rule ${this.id} - returning empty results`);
      return [];
    }

    console.log(`[AIRule] Processing rule ${this.id} with ${this.provider}:${this.model}`);
    
    let lastError: Error | null = null;
    
    // Retry logic for transient failures
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        
        // Call AI service
        const aiMatches = await this.aiService.callAI(this.promptTemplate, text, this.model);
        
        const processingTime = Date.now() - startTime;
        console.log(`[AIRule] Rule ${this.id} completed in ${processingTime}ms with ${aiMatches.length} matches`);
        
        // Validate and convert matches
        const validMatches = aiMatches.filter(match => {
          if (!this.validateAIMatch(match)) {
            console.warn(`[AIRule] Invalid AI match format in rule ${this.id}:`, match);
            return false;
          }
          
          // Validate positions are within text bounds
          if (match.end > text.length) {
            console.warn(`[AIRule] AI match position out of bounds in rule ${this.id}: end=${match.end}, textLength=${text.length}`);
            return false;
          }
          
          return true;
        });

        return validMatches.map(match => this.convertAIMatchToRuleMatch(match));
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(`[AIRule] Attempt ${attempt}/${this.maxRetries} failed for rule ${this.id}:`, lastError.message);
        
        // Don't retry on certain types of errors
        if (lastError.message.includes('Invalid OpenAI API key') ||
            lastError.message.includes('quota exceeded') ||
            lastError.message.includes('invalid JSON')) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new RuleExecutionError(
      `Failed to execute AI rule after ${this.maxRetries} attempts`,
      this.id,
      lastError || new Error('Unknown error')
    );
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
    // Resolve from the current working directory so it works
    // in local dev and serverless (e.g. Vercel) environments.
    const defaultConfigPath = path.resolve(process.cwd(), 'config/rules.json');
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

    // Check if we have API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[AIRuleProcessor] No OPENAI_API_KEY found - AI rules will be skipped');
      return [];
    }

    console.log(`[AIRuleProcessor] Processing ${this.rules.length} AI rules...`);
    
    // Process rules with concurrency limit
    const concurrency = parseInt(process.env.AI_RULES_CONCURRENCY || '2');
    const matchesByRule: RuleMatch[][] = [];
    
    for (let i = 0; i < this.rules.length; i += concurrency) {
      const batch = this.rules.slice(i, i + concurrency);
      const batchPromises = batch.map(rule => rule.safeExecute(text));
      const batchResults = await Promise.all(batchPromises);
      matchesByRule.push(...batchResults);
    }

    const allMatches = matchesByRule.flat();
    console.log(`[AIRuleProcessor] Completed processing ${this.rules.length} AI rules, found ${allMatches.length} matches`);
    
    return allMatches;
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): AIRule | undefined {
    return this.rules.find(rule => rule.id === ruleId);
  }
}
