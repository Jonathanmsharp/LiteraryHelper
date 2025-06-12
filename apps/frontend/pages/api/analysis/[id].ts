import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let userId = req.headers['x-auth-user-id'] as string | undefined;

    if (!userId) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      userId = 'anonymous';
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Analysis ID is required' });
    }

    // For now, return a mock response since we're not using the queue yet
    // In the actual implementation, this would query the queue service
    res.status(200).json({
      id: id,
      state: 'completed',
      progress: 100,
      result: { message: 'Analysis complete' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve analysis result' });
  }
}
