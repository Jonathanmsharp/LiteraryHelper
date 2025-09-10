import type { NextApiRequest, NextApiResponse } from 'next'

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

    // TODO: Implement actual analysis logic here
    // For now, return a mock response to demonstrate the functionality
    
    const mockResults = [
      {
        ruleId: 'very-weakener',
        ruleName: '"Very" Weakener',
        matches: [
          {
            ruleId: 'very-weakener',
            range: { start: 25, end: 29, text: 'very' },
            suggestion: 'Consider removing "very" for stronger writing',
            explanation: 'The word "very" often weakens your writing. Try using a stronger adjective instead.',
            severity: 'info'
          }
        ],
        processingTimeMs: 45
      },
      {
        ruleId: 'passive-voice',
        ruleName: 'Passive Voice',
        matches: [
          {
            ruleId: 'passive-voice',
            range: { start: 100, end: 130, text: 'was written badly' },
            suggestion: 'This text was written poorly',
            explanation: 'Passive voice can make writing feel distant and weak. Consider using active voice.',
            severity: 'warning'
          }
        ],
        processingTimeMs: 32
      }
    ]

    // Create analysis result
    const analysisResult = {
      id: `analysis_${Date.now()}`,
      timestamp: new Date().toISOString(),
      text,
      textHash: `hash_${text.length}_${text.slice(0, 10)}`,
      userId: isDemoMode ? 'demo-user' : userId,
      sessionId: isDemoMode ? 'demo-session' : sessionId,
      results: mockResults,
      status: 'completed' as const,
      processingTimeMs: 150,
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