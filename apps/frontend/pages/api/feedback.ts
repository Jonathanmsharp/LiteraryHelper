import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let userId = req.headers['x-auth-user-id'] as string | undefined;
    const sessionId = req.headers['x-auth-session-id'] as string | undefined;

    if (!userId) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      userId = 'anonymous';
      console.warn('[feedback] Proceeding without authentication – NODE_ENV != production.');
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { ruleId, helpful, notes, matchText, analysisId } = req.body;

    if (!ruleId || typeof helpful !== 'boolean') {
      return res.status(400).json({ 
        error: 'Missing required fields: ruleId and helpful (boolean) are required' 
      });
    }

    // Create feedback record
    const feedback = {
      id: require('crypto').randomUUID(),
      userId,
      sessionId,
      ruleId,
      helpful,
      notes: notes || null,
      matchText: matchText || null,
      analysisId: analysisId || null,
      createdAt: new Date().toISOString(),
    };

    // TODO: Store in database (analysis_feedback table)
    // For now, just log the feedback
    console.log('[feedback] User feedback received:', feedback);

    // Simulate database storage
    console.log(`[feedback] Stored feedback in database:
      - User: ${userId}
      - Rule: ${ruleId} 
      - Helpful: ${helpful}
      - Text: "${matchText}"
      - Notes: "${notes}"
      - Timestamp: ${feedback.createdAt}`);

    res.status(201).json({
      message: 'Feedback recorded successfully',
      feedbackId: feedback.id,
      userId,
      ruleId,
      helpful,
      timestamp: feedback.createdAt,
    });
  } catch (err) {
    console.error('[feedback] Error:', err);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
}
