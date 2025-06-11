/**
 * Test script for SimpleRuleProcessor
 * 
 * This script tests the SimpleRuleProcessor against the sample data
 * to verify that it correctly identifies rule matches.
 * 
 * Usage:
 *   ts-node test-simple.ts
 */

import fs from 'fs';
import path from 'path';
import { SimpleRuleProcessor } from './SimpleRuleProcessor';

/**
 * Format a match for console output
 */
function formatMatch(match: any): string {
  return [
    `Rule: ${match.ruleId}`,
    `Text: "${match.range.text}"`,
    `Position: ${match.range.start}-${match.range.end}`,
    `Severity: ${match.severity}`,
    `Suggestion: ${match.suggestion}`,
    `Explanation: ${match.explanation}`,
    '---'
  ].join('\n');
}

/**
 * Main test function
 */
async function testSimpleRules(): Promise<void> {
  try {
    // Create the processor
    const processor = new SimpleRuleProcessor();
    
    // Log the loaded rules
    console.log('Loaded rules:');
    processor.getRules().forEach(rule => {
      console.log(`- ${rule.id} (${rule.severity}): ${rule.description}`);
    });
    console.log();
    
    // Load the sample data
    const samplePath = path.resolve(__dirname, '../../../../sample-docs/sample1.md');
    const sampleText = fs.readFileSync(samplePath, 'utf-8');
    
    console.log(`Processing sample text (${sampleText.length} characters)...`);
    console.log('Sample preview:');
    console.log(sampleText.substring(0, 150) + '...');
    console.log();
    
    // Process the text
    console.time('Processing time');
    const matches = await processor.processText(sampleText);
    console.timeEnd('Processing time');
    
    // Output the results
    console.log(`\nFound ${matches.length} matches:`);
    
    // Group matches by rule
    const matchesByRule = matches.reduce((acc, match) => {
      acc[match.ruleId] = acc[match.ruleId] || [];
      acc[match.ruleId].push(match);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Output matches by rule
    Object.entries(matchesByRule).forEach(([ruleId, ruleMatches]) => {
      console.log(`\n== ${ruleId}: ${ruleMatches.length} matches ==`);
      ruleMatches.slice(0, 3).forEach(match => {
        console.log(formatMatch(match));
      });
      
      if (ruleMatches.length > 3) {
        console.log(`... and ${ruleMatches.length - 3} more matches.`);
      }
    });
    
    // Compare with expected results if available
    try {
      const expectedPath = path.resolve(__dirname, '../../../../sample-docs/sample1_expected.json');
      const expectedJson = fs.readFileSync(expectedPath, 'utf-8');
      const expected = JSON.parse(expectedJson);
      
      console.log('\nComparison with expected results:');
      console.log(`Expected total matches: ${expected.length}`);
      console.log(`Actual total matches: ${matches.length}`);
      
      // Simple validation
      if (matches.length === expected.length) {
        console.log('✅ Match count matches expected count.');
      } else {
        console.log('❌ Match count differs from expected count.');
      }
    } catch (error) {
      console.log('\nNo expected results file found for comparison.');
    }
    
  } catch (error) {
    console.error('Error running test:', error instanceof Error ? error.message : String(error));
  }
}

// Run the test
testSimpleRules().catch(console.error);
