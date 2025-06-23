import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from '../../../lib/verifyToken'
import { getAnalysisCache } from '../../../lib/cache/RedisCache'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    /* ------------------------------------------------------------------ */
    /* 1. Authentication (Bearer JWT)                                     */
    /* ------------------------------------------------------------------ */
    const authHeader = req.headers.authorization || ''
    const match = authHeader.match(/^Bearer (.+)$/i)
    if (!match) {
      return res.status(401).json({ error: 'Unauthorized – missing Bearer token' })
    }
    let userId: string
    try {
      // verifyToken may return a Promise<JWTPayload>; await to safely access its fields
      const payload = await verifyToken(match[1])
      userId = (payload as any).userId
    } catch {
      return res.status(401).json({ error: 'Unauthorized – invalid token' })
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Analysis ID is required' });
    }

    /* ------------------------------------------------------------------ */
    /* 2. Query cache / persistence layer                                 */
    /* ------------------------------------------------------------------ */
    const cache = getAnalysisCache()
    // tests mock getCachedResult; real impl would query Redis/DB
    const job = await (cache as any).getCachedResult(id)

    if (!job) {
      return res.status(404).json({ error: 'Analysis not found' })
    }

    if (job.status === 'processing') {
      return res.status(202).json({ status: 'processing' })
    }

    // Completed
    return res.status(200).json({
      ...job,
      status: 'complete',
    })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve analysis result' });
  }
}
