import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get user ID from header set by middleware
    let userId = req.headers['x-auth-user-id'] as string | undefined
    const sessionId = req.headers['x-auth-session-id'] as string | undefined

    // In development/preview we might run without Clerk – allow anonymous access
    if (!userId) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      userId = 'anonymous'
      console.warn(
        '[analyze] Proceeding without authentication – NODE_ENV != production.'
      )
    } else {
      console.log('Authenticated user:', userId)
    }

    // Handle only POST requests for analysis
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Extract text from request body
    const { text } = req.body
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' })
    }

    // TODO: Run the analysis job here...
    // This is where you would process the text and apply rules
    
    // For now, just return a success response
    res.status(200).json({ 
      message: 'Analysis started',
      userId,
      sessionId,
      textLength: text.length,
      // You would include job ID or initial results here
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Analysis failed' })
  }
}
