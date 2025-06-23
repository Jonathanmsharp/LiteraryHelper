/**
 * Rule Seeding Script
 * 
 * This script seeds the database with initial rule definitions for the LiteraryHelper application.
 * It includes both simple (regex-based) and AI-powered rules with various severity levels.
 * 
 * Usage:
 * - Direct execution: `ts-node scripts/seedRules.ts`
 * - Import: `import { seedRules } from './scripts/seedRules'`
 */

import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import colors from 'colors/safe';

// Import schema (adjust path as needed based on relative location)
import { rules, RuleType, RuleSeverity } from '../apps/frontend/db/schema';

// Define rule data structure
interface RuleData {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  severity: RuleSeverity;
  pattern?: string;
  promptTemplate?: string;
  model?: string;
  provider?: string;
}

/**
 * Load AI prompt template from file
 */
async function loadPromptTemplate(filename: string): Promise<string> {
  try {
    const promptPath = path.join(process.cwd(), 'config', 'ai-prompts', filename);
    return await fs.readFile(promptPath, 'utf-8');
  } catch (error) {
    console.error(colors.red(`Error loading prompt template ${filename}:`), error);
    throw new Error(`Failed to load prompt template: ${filename}`);
  }
}

/**
 * Get database connection
 */
function getDbConnection() {
  const connectionString = process.env.POSTGRES_URL || 
    'postgresql://postgres:postgres@localhost:5432/literaryhelper';
  
  console.log(colors.blue('Connecting to database...'));
  
  try {
    const pool = new Pool({ connectionString });
    const db = drizzle(pool);
    return { pool, db };
  } catch (error) {
    console.error(colors.red('Failed to connect to database:'), error);
    throw new Error('Database connection failed');
  }
}

/**
 * Seed rules into the database
 */
export async function seedRules(): Promise<void> {
  console.log(colors.green('Starting rule seeding process...'));
  
  // Get database connection
  const { pool, db } = getDbConnection();
  
  try {
    // Load AI prompt templates
    const [toneConsistencyPrompt, inclusiveLanguagePrompt, claimsWithoutEvidencePrompt] = 
      await Promise.all([
        loadPromptTemplate('tone-consistency.txt'),
        loadPromptTemplate('inclusive-language.txt'),
        loadPromptTemplate('claims-without-evidence.txt')
      ]);
    
    // Define rules
    const ruleData: RuleData[] = [
      // Simple rules (regex-based)
      {
        id: 'passive-voice',
        name: 'Passive Voice',
        description: 'Identifies passive voice constructions that could be rewritten in active voice for stronger, clearer writing.',
        type: 'simple',
        severity: 'warning',
        pattern: '\\b(am|is|are|was|were|be|been|being)\\s+(\\w+ed|\\w+en)\\b(?!\\s+by\\b)',
      },
      {
        id: 'wordiness',
        name: 'Wordy Phrases',
        description: 'Detects common wordy phrases that can be simplified for clearer communication.',
        type: 'simple',
        severity: 'info',
        pattern: '\\b(in order to|due to the fact that|in spite of the fact that|on account of|in the event that|it is important to note that|for the purpose of|in the process of)\\b',
      },
      {
        id: 'repetitive-phrases',
        name: 'Repetitive Phrases',
        description: 'Identifies phrases or words that are repeated in close proximity, which may indicate redundancy.',
        type: 'simple',
        severity: 'info',
        pattern: '\\b(\\w+\\s+\\w+)\\s+(?:\\w+\\s+){1,10}\\1\\b',
      },
      
      // AI-powered rules
      {
        id: 'tone-consistency',
        name: 'Tone Consistency',
        description: 'Analyzes the text for consistent tone and voice throughout the document.',
        type: 'ai',
        severity: 'warning',
        promptTemplate: toneConsistencyPrompt,
        model: 'gpt-4o',
        provider: 'openai',
      },
      {
        id: 'inclusive-language',
        name: 'Inclusive Language',
        description: 'Identifies potentially non-inclusive language and suggests more inclusive alternatives.',
        type: 'ai',
        severity: 'warning',
        promptTemplate: inclusiveLanguagePrompt,
        model: 'gpt-4o',
        provider: 'openai',
      },
      {
        id: 'claims-without-evidence',
        name: 'Claims Without Evidence',
        description: 'Detects claims or assertions that lack supporting evidence or citations.',
        type: 'ai',
        severity: 'error',
        promptTemplate: claimsWithoutEvidencePrompt,
        model: 'gpt-4o',
        provider: 'openai',
      },
    ];
    
    // Insert or update rules
    console.log(colors.blue('Seeding rules...'));
    
    for (const rule of ruleData) {
      try {
        // Check if rule exists
        const existingRules = await db.select().from(rules).where(eq(rules.id, rule.id));
        
        if (existingRules.length > 0) {
          // Update existing rule
          await db.update(rules)
            .set({
              name: rule.name,
              description: rule.description,
              type: rule.type,
              severity: rule.severity,
              pattern: rule.pattern,
              promptTemplate: rule.promptTemplate,
              model: rule.model,
              provider: rule.provider,
              updatedAt: new Date(),
            })
            .where(eq(rules.id, rule.id));
          
          console.log(colors.yellow(`Updated existing rule: ${rule.id}`));
        } else {
          // Insert new rule
          await db.insert(rules).values({
            id: rule.id,
            name: rule.name,
            description: rule.description,
            type: rule.type,
            severity: rule.severity,
            pattern: rule.pattern,
            promptTemplate: rule.promptTemplate,
            model: rule.model,
            provider: rule.provider,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          console.log(colors.green(`Created new rule: ${rule.id}`));
        }
      } catch (error) {
        console.error(colors.red(`Failed to seed rule ${rule.id}:`), error);
      }
    }
    
    // Verify seeded rules
    const seededRules = await db.select().from(rules);
    console.log(colors.green(`Successfully seeded ${seededRules.length} rules:`));
    
    seededRules.forEach(rule => {
      const severityColor = 
        rule.severity === 'error' ? colors.red :
        rule.severity === 'warning' ? colors.yellow :
        colors.blue;
      
      console.log(
        `- ${colors.bold(rule.name)} (${rule.id}): ` +
        `${severityColor(rule.severity)} | ${rule.type === 'simple' ? 'Regex' : 'AI'}`
      );
    });
    
  } catch (error) {
    console.error(colors.red('Rule seeding failed:'), error);
    throw error;
  } finally {
    // Close database connection
    await pool.end();
    console.log(colors.blue('Database connection closed.'));
  }
  
  console.log(colors.green('Rule seeding completed successfully!'));
}

/**
 * Run script directly if not imported
 */
if (require.main === module) {
  // Load environment variables
  try {
    require('dotenv').config();
  } catch (error) {
    console.warn(colors.yellow('dotenv not found, using default environment variables.'));
  }
  
  // Execute seeding
  seedRules()
    .then(() => {
      console.log(colors.green('✅ Seed script completed successfully!'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(colors.red('❌ Seed script failed:'), error);
      process.exit(1);
    });
}

/**
 * Export functions for use in other scripts
 */
export { getDbConnection, loadPromptTemplate };
export type { RuleData };
