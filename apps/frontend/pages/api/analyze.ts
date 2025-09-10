import type { NextApiRequest, NextApiResponse } from 'next'
import { CombinedRuleProcessor } from '../../lib/rules/CombinedRuleProcessor'
import path from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get user ID from header set by middleware
    const userId = req.headers['x-auth-user-id'] as string
    const sessionId = req.headers['x-auth-session-id'] as string
    const isDemoMode = req.headers['x-auth-demo-mode'] === 'true'
    
    // Handle only POST requests for analysis
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method not allowed',
        message: 'Only POST requests are supported for analysis'
      })
    }

    // Extract text from request body
    const { text } = req.body
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: 'Text is required and must be a string'
      })
    }

    if (text.length < 10) {
      return res.status(400).json({
        error: 'Text too short',
        message: 'Please provide at least 10 characters for analysis'
      })
    }

    if (text.length > 10000) {
      return res.status(400).json({
        error: 'Text too long',
        message: 'Text must be less than 10,000 characters'
      })
    }

    console.log('Analysis request:', { 
      userId, 
      sessionId, 
      isDemoMode, 
      textLength: text.length 
    })

    // Use the same path resolution as the rules API
    const rulesConfigPath = path.resolve(process.cwd(), 'config', 'rules.json')
    
    // Initialize the combined rule processor with explicit path
    const processor = new CombinedRuleProcessor(rulesConfigPath)
    
    // Process the text with all rules
    const startTime = Date.now()
    const allMatches = await processor.processText(text)
    const processingTime = Date.now() - startTime

    console.log(`Found ${allMatches.length} matches from rule processing`)

    // Group matches by rule ID for the response format
    const resultsByRule = new Map<string, any>()
    
    for (const match of allMatches) {
      if (!resultsByRule.has(match.ruleId)) {
        // Get rule info from processors
        const simpleRule = processor.getSimpleRule(match.ruleId)
        const aiRule = processor.getAIRule(match.ruleId)
        const rule = simpleRule || aiRule
        
        if (rule) {
          resultsByRule.set(match.ruleId, {
            ruleId: match.ruleId,
            ruleName: rule.name,
            matches: [],
            processingTimeMs: 0
          })
        }
      }
      
      const ruleResult = resultsByRule.get(match.ruleId)
      if (ruleResult) {
        ruleResult.matches.push(match)
      }
    }

    // Convert to array and add processing times
    const results = Array.from(resultsByRule.values()).map(result => ({
      ...result,
      processingTimeMs: Math.round(processingTime / Math.max(resultsByRule.size, 1)) // Avoid division by zero
    }))

    console.log(`Returning ${results.length} rule results`)

    // Create analysis result
    const analysisResult = {
      id: `analysis_${Date.now()}`,
      timestamp: new Date().toISOString(),
      text,
      textHash: `hash_${text.length}_${text.slice(0, 10)}`,
      userId: isDemoMode ? 'demo-user' : userId,
      sessionId: isDemoMode ? 'demo-session' : sessionId,
      results,
      status: 'completed' as const,
      processingTimeMs: processingTime,
      demoMode: isDemoMode
    }

    res.status(200).json(analysisResult)
    
  } catch (err) {
    console.error('Analysis error:', err)
    res.status(500).json({ 
      error: 'Analysis failed',
      message: 'An internal error occurred while processing your text. Please try again.',
      ...(process.env.NODE_ENV === 'development' && { 
        details: err instanceof Error ? err.message : 'Unknown error'
      })
    })
  }
}
