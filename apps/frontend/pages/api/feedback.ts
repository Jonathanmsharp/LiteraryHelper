import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from '../../lib/verifyToken'
import config from '../../lib/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    /* ------------------------------------------------------------------ */
    /* 1. Authentication – JWT unless demo / anonymous mode is enabled   */
    /* ------------------------------------------------------------------ */
    const authHeader = req.headers.authorization || ''
    const tokenMatch = authHeader.match(/^Bearer (.+)$/i)

    // Demo / anonymous mode detection (same logic as analyze endpoint)
    const demoMode =
      config.demo.enableDemoMode ||
      config.demo.allowAnonymousAccess ||
      (!config.jwt.publicKey && !config.jwt.jwksUrl)

    let userId: string

    if (demoMode) {
      if (tokenMatch) {
        // Prefer authenticated user if token provided
        try {
          const payload = await verifyToken(tokenMatch[1])
          userId = (payload as any).userId
          console.log('[feedback] Demo mode: authenticated demo request for', userId)
        } catch {
          userId = 'demo-user'
          console.log('[feedback] Demo mode: invalid token ignored, using demo-user')
        }
      } else {
        userId = 'demo-user'
        console.log('[feedback] Demo mode: anonymous feedback allowed')
      }
    } else {
      // Strict JWT required
      if (!tokenMatch) {
        return res.status(401).json({ error: 'Unauthorized – missing Bearer token' })
      }
      try {
        const payload = await verifyToken(tokenMatch[1])
        userId = (payload as any).userId
      } catch {
        return res.status(401).json({ error: 'Unauthorized – invalid token' })
      }
    }

    const sessionId = req.headers['x-auth-session-id'] as string | undefined;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    /* ------------------------------------------------------------------ */
    /* 2. Validate payload                                                */
    /* ------------------------------------------------------------------ */
    const { matchId, ruleId, isHelpful, comment } = req.body;

    if (!matchId || !ruleId || typeof isHelpful !== 'boolean') {
      return res.status(400).json({
        error:
          'Missing required fields: matchId, ruleId and isHelpful (boolean) are required',
      });
    }

    // Create feedback record
    const feedbackRecord = {
      id: require('crypto').randomUUID(),
      userId,
      sessionId,
      ruleId,
      matchId,
      helpful: isHelpful,
      comment: comment || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    /* ------------------------------------------------------------------ */
    /* 3. Persist to database                                             */
    /* ------------------------------------------------------------------ */
    try {
      // Lazy-load pg / drizzle so jest/unit tests needn’t load them unless
      // the API route is actually invoked.
      const { Pool } = await import('pg');
      const { drizzle } = await import('drizzle-orm/node-postgres');
      const { analysisFeedback } = await import('../../db/schema');

      // Singleton pool on globalThis to avoid exhausting connection limit
      const g = globalThis as any;
      g.__feedbackPool =
        g.__feedbackPool ||
        new Pool({
          connectionString: process.env.POSTGRES_URL,
          max: 2,
        });

      const db = drizzle(g.__feedbackPool);
      const inserted = await db
        .insert(analysisFeedback)
        .values(feedbackRecord)
        .returning({ id: analysisFeedback.id, createdAt: analysisFeedback.createdAt });

      const insertedRow = inserted[0];

      res.status(200).json({
        success: true,
        feedbackId: insertedRow.id,
        userId,
        ruleId,
        helpful: isHelpful,
        timestamp: insertedRow.createdAt,
      });
    } catch (dbErr) {
      console.error('[feedback] DB error:', dbErr);
      return res.status(500).json({ error: 'Failed to record feedback' });
    }
  } catch (err) {
    console.error('[feedback] Error:', err);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
}
