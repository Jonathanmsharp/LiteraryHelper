const { AIRuleProcessor } = require('./lib/rules/AIRuleProcessor.js');
const path = require('path');

// Set environment variables for testing
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key-not-set';
process.env.AI_RULES_CONCURRENCY = '1';
process.env.AI_RULE_TIMEOUT_MS = '10000';
process.env.AI_TEMPERATURE = '0.2';

async function testAIIntegration() {
  console.log('🧪 Testing AI Integration...\n');

  try {
    // Create AI rule processor with correct path
    const configPath = path.resolve(__dirname, '../../config/rules.json');
    console.log('Config path:', configPath);
    
    const processor = new AIRuleProcessor(configPath);
    
    console.log('✅ AI Rule Processor created successfully');
    
    // Get loaded rules
    const rules = processor.getRules();
    console.log(`✅ Loaded ${rules.length} AI rules:`);
    rules.forEach(rule => {
      console.log(`   - ${rule.id}: ${rule.name} (${rule.severity})`);
    });
    
    // Test with sample text
    const sampleText = "The myriad complexities inherent in this situation require careful consideration. One must endeavor to comprehend the multifaceted nature of this veritable plethora of options.";
    
    console.log('\n📝 Testing with sample text:');
    console.log(`"${sampleText}"`);
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test-key-not-set') {
      console.log('\n⚠️  No OPENAI_API_KEY found - AI rules will be skipped (this is expected)');
      
      // Test without API key (should return empty results)
      const results = await processor.processText(sampleText);
      console.log(`✅ AI processing completed without API key: ${results.length} matches found`);
      
    } else {
      console.log('\n�� OPENAI_API_KEY found - testing actual AI calls...');
      
      // Test with real API key
      const startTime = Date.now();
      const results = await processor.processText(sampleText);
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ AI processing completed in ${processingTime}ms`);
      console.log(`✅ Found ${results.length} total matches`);
      
      if (results.length > 0) {
        console.log('\n📋 Match details:');
        results.forEach((match, index) => {
          console.log(`   ${index + 1}. Rule: ${match.ruleId}`);
          console.log(`      Text: "${match.range.text}"`);
          console.log(`      Reason: ${match.explanation}`);
          console.log(`      Suggestion: ${match.suggestion || 'None'}`);
          console.log(`      Severity: ${match.severity}`);
          console.log(`      Position: ${match.range.start}-${match.range.end}`);
          console.log('');
        });
      }
    }
    
    console.log('🎉 AI Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testAIIntegration();
