import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from '@/lib/verifyToken'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req)
    console.log('Authenticated user:', user.sub)

    // Run the analysis job here...
    res.status(200).json({ message: 'Authorized!', user })
  } catch (err) {
    console.error(err)
    res.status(401).json({ error: 'Unauthorized' })
  }
}
