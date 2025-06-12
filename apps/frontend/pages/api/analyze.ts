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

    // Lazy-load processors
    const [{ SimpleRuleProcessor }, { AIRuleProcessor }] = await Promise.all([
      import('../../../lib/rules/SimpleRuleProcessor'),
      import('../../../lib/rules/AIRuleProcessor'),
    ])

    // Cache processor instances globally
    const g = globalThis as any
    g.__simpleProcessor = g.__simpleProcessor || new SimpleRuleProcessor()
    g.__aiProcessor = g.__aiProcessor || new AIRuleProcessor()
    const simpleProcessor = g.__simpleProcessor as InstanceType<typeof SimpleRuleProcessor>
    const aiProcessor = g.__aiProcessor as InstanceType<typeof AIRuleProcessor>

    // Run processors in parallel
    const [simpleMatches, aiMatches] = await Promise.all([
      simpleProcessor.processText(text),
      aiProcessor.processText(text),
    ])

    const allMatches = [...simpleMatches, ...aiMatches]

    res.status(200).json({
      message: 'Analysis completed',
      userId,
      sessionId,
      textLength: text.length,
      matchCount: allMatches.length,
      matches: allMatches,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Analysis failed' })
  }
}
