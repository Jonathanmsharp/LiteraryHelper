"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRuleProcessor = exports.AIRule = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const BaseRule_1 = require("./BaseRule");
/**
 * Implementation of an AI-powered rule
 */
class AIRule extends BaseRule_1.BaseRule {
    /**
     * Create a new AI rule
     */
    constructor(id, name, description, severity, promptTemplate, model = 'gpt-4o', provider = 'openai') {
        super(id, name, description, 'ai', severity);
        this.promptTemplate = promptTemplate;
        this.model = model;
        this.provider = provider;
    }
    /**
     * Execute the AI rule against the provided text
     */
    async execute(text) {
        try {
            // For now, simulate AI processing with pattern matching
            // In a real implementation, this would call the OpenAI API
            console.log(`[AIRule] Processing rule ${this.id} with ${this.provider}:${this.model}`);
            // Simulate AI processing delay
            await new Promise(resolve => setTimeout(resolve, 100));
            // Return empty matches for now - will implement actual AI in Step 16-17
            return [];
        }
        catch (error) {
            throw new BaseRule_1.RuleExecutionError('Failed to execute AI rule', this.id, error instanceof Error ? error : new Error(String(error)));
        }
    }
}
exports.AIRule = AIRule;
/**
 * Processor for AI rules
 */
class AIRuleProcessor {
    /**
     * Create a new AI rule processor
     */
    constructor(configPath) {
        /**
         * The loaded AI rules
         */
        this.rules = [];
        const defaultConfigPath = path_1.default.resolve(__dirname, '../../../../config/rules.json');
        this.loadRules(configPath || defaultConfigPath);
    }
    /**
     * Load rules from the config file
     */
    loadRules(configPath) {
        try {
            const configContent = fs_1.default.readFileSync(configPath, 'utf-8');
            const allRules = JSON.parse(configContent.replace(/\/\/.*$/gm, ''));
            const aiRules = allRules.filter(rule => rule.type === 'ai');
            this.rules = aiRules.map(rule => new AIRule(rule.id, rule.name, rule.description, rule.severity, rule.promptTemplate, rule.model, rule.provider));
            console.log(`Loaded ${this.rules.length} AI rules.`);
        }
        catch (error) {
            console.error('Failed to load AI rules:', error instanceof Error ? error.message : String(error));
            this.rules = [];
        }
    }
    /**
     * Get all loaded AI rules
     */
    getRules() {
        return this.rules;
    }
    /**
     * Process text with all AI rules
     */
    async processText(text) {
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
    getRule(ruleId) {
        return this.rules.find(rule => rule.id === ruleId);
    }
}
exports.AIRuleProcessor = AIRuleProcessor;
