import { getAuth } from '@clerk/nextjs/server'
import type { NextApiRequest, NextApiResponse } from 'next'

type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void

export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get auth data from Clerk
      const { userId, sessionId } = getAuth(req)
      
      // Check if the user is authenticated
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      // Attach user data to the request for use in the handler
      ;(req as any).auth = { userId, sessionId }
      
      // Call the original handler
      return handler(req, res)
    } catch (error) {
      console.error('Authentication error:', error)
      return res.status(401).json({ error: 'Authentication failed' })
    }
  }
}
