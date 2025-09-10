import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { verifyToken } from '../../lib/verifyToken';
import config from '../../lib/env';

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
    /* ------------------------------------------------------------------ */
    /* Authentication                                                    */
    /* ------------------------------------------------------------------ */
    const demoMode =
      config.demo.enableDemoMode ||
      config.demo.allowAnonymousAccess ||
      (!config.jwt.publicKey && !config.jwt.jwksUrl);

    const authHeader = req.headers.authorization || '';
    const tokenMatch = authHeader.match(/^Bearer (.+)$/i);

    if (demoMode) {
      // Demo / anonymous mode – token optional
      if (tokenMatch) {
        try {
          verifyToken(tokenMatch[1]);
          console.log('[rules] Demo mode: authenticated request');
        } catch {
          console.warn('[rules] Demo mode: invalid token ignored');
        }
      } else {
        console.log('[rules] Demo mode: anonymous request allowed');
      }
    } else {
      // Production mode – strict JWT auth
      if (!tokenMatch) {
        return res.status(401).json({ error: 'Unauthorized – missing Bearer token' });
      }
      try {
        verifyToken(tokenMatch[1]); // We don't use the payload here, only validation
      } catch {
        return res.status(401).json({ error: 'Unauthorized – invalid token' });
      }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Try multiple possible paths for the rules config
    const possiblePaths = [
      path.resolve(process.cwd(), 'config', 'rules.json'),
      path.resolve(process.cwd(), '..', 'config', 'rules.json'),
      path.resolve(process.cwd(), '..', '..', 'config', 'rules.json'),
      path.join(process.cwd(), 'config', 'rules.json'),
      path.join(process.cwd(), '..', 'config', 'rules.json'),
      path.join(process.cwd(), '..', '..', 'config', 'rules.json'),
    ];

    let rulesConfigPath: string | null = null;
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        rulesConfigPath = testPath;
        console.log('[rules] Found config at:', testPath);
        break;
      } catch {
        // Continue to next path
      }
    }

    if (!rulesConfigPath) {
      console.error('[rules] Could not find rules.json in any of these paths:', possiblePaths);
      return res.status(500).json({ error: 'Rules configuration file not found' });
    }

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
