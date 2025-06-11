import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from './_middleware'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // User is already authenticated by withAuth middleware
    const { userId } = (req as any).auth
    console.log('Authenticated user:', userId)

    // Run the analysis job here...
    // This is where you would process the text and apply rules
    
    res.status(200).json({ 
      message: 'Analysis started',
      userId,
      // You would include job ID or initial results here
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Analysis failed' })
  }
}

export default withAuth(handler)
