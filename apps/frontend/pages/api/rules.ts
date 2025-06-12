import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

interface RuleMeta {
  id: string;
  name: string;
  description: string;
  type: 'simple' | 'ai';
  severity: string;
}

let cachedRules: RuleMeta[] | null = null;
let lastLoaded = 0;
const CACHE_TTL = 60_000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const rulesConfigPath = path.resolve(process.cwd(), 'config', 'rules.json');

    if (cachedRules && Date.now() - lastLoaded < CACHE_TTL) {
      if (req.method === 'HEAD') return res.status(204).end();
      return res.status(200).json(cachedRules);
    }

    const raw = await fs.readFile(rulesConfigPath, 'utf8');
    const withoutComments = raw.replace(/^[ \t]*\/\/.*$/gm, '');
    const parsed: any[] = JSON.parse(withoutComments);

    cachedRules = parsed.map<RuleMeta>(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      type: rule.type,
      severity: rule.severity,
    }));
    lastLoaded = Date.now();

    if (req.method === 'HEAD') return res.status(204).end();
    res.status(200).json(cachedRules);
  } catch (error) {
    console.error('Failed to retrieve rules metadata:', error);
    return res.status(500).json({ error: 'Failed to load rules metadata' });
  }
}
