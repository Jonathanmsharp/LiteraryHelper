import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let userId = req.headers['x-auth-user-id'] as string | undefined
    const sessionId = req.headers['x-auth-session-id'] as string | undefined

    if (!userId) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      userId = 'anonymous'
      console.warn('[analyze] Proceeding without authentication – NODE_ENV != production.')
    } else {
      console.log('Authenticated user:', userId)
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { text } = req.body
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' })
    }

    // Step 20: Check cache first
    const { getAnalysisCache } = await import('../../lib/cache/RedisCache')
    const cache = getAnalysisCache()
    
    const cachedResult = await cache.getCachedResult(text, userId)
    if (cachedResult) {
      return res.status(200).json({
        ...cachedResult,
        fromCache: true,
        message: 'Analysis completed (cached)',
      })
    }

    // Step 19: Orchestrate rule processing
    const { randomUUID } = await import('crypto')
    const jobId = randomUUID()

    const [{ SimpleRuleProcessor }, { AIRuleProcessor }] = await Promise.all([
      import('../../lib/rules/SimpleRuleProcessor'),
      import('../../lib/rules/AIRuleProcessor'),
    ])

    const g = globalThis as any
    g.__simpleProcessor = g.__simpleProcessor || new SimpleRuleProcessor()
    g.__aiProcessor = g.__aiProcessor || new AIRuleProcessor()
    const simpleProcessor = g.__simpleProcessor as InstanceType<typeof SimpleRuleProcessor>
    const aiProcessor = g.__aiProcessor as InstanceType<typeof AIRuleProcessor>

    // Run simple rules first (synchronous)
    const simpleMatches = await simpleProcessor.processText(text)

    // Run AI rules (since queue not implemented yet, run locally)
    console.log('[analyze] Running AI rules locally (queue not available)')
    const aiMatches = await aiProcessor.processText(text)
    
    const allMatches = [...simpleMatches, ...aiMatches]

    const result = {
      message: 'Analysis completed',
      userId,
      sessionId,
      jobId,
      textLength: text.length,
      matchCount: allMatches.length,
      matches: allMatches,
      status: 'completed',
      fromCache: false,
    }

    // Cache the result
    await cache.cacheResult(text, userId, result)

    res.status(200).json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Analysis failed' })
  }
}
