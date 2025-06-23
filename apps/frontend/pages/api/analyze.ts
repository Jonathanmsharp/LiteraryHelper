import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from '../../lib/verifyToken'
import config from '../../lib/env'
import {
  notifyAnalysisProgress,
  type AnalysisEventType,
} from './websocket'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    /* ------------------------------------------------------------------ */
    /* 1. Authentication – JWT unless demo / anonymous mode is enabled.   */
    /* ------------------------------------------------------------------ */
    const authHeader = req.headers.authorization || ''
    const tokenMatch = authHeader.match(/^Bearer (.+)$/i)

    // determine if we are in demo/anonymous mode
    const demoMode =
      config.demo.enableDemoMode ||
      config.demo.allowAnonymousAccess ||
      (!config.jwt.publicKey && !config.jwt.jwksUrl)

    let userId: string

    if (demoMode) {
      // In demo mode allow anonymous access (use a fixed demo user id)
      if (tokenMatch) {
        // If a token is supplied, prefer the real user id
        try {
          const payload = await verifyToken(tokenMatch[1])
          userId = (payload as any).userId
          console.log('[analyze] Demo mode: authenticated demo request for', userId)
        } catch {
          userId = 'demo-user'
          console.log('[analyze] Demo mode: invalid token ignored, using demo-user')
        }
      } else {
        userId = 'demo-user'
        console.log('[analyze] Demo mode: anonymous request allowed')
      }
    } else {
      // Strict JWT auth required
      if (!tokenMatch) {
        return res.status(401).json({ error: 'Unauthorized – missing Bearer token' })
      }
      try {
        const payload = await verifyToken(tokenMatch[1])
        // verifyToken may return either a JWTPayload or a custom object;
        // use a broad assertion to satisfy TypeScript without over-narrowing.
        userId = (payload as any).userId
      } catch {
        return res.status(401).json({ error: 'Unauthorized – invalid token' })
      }
    }

    /* ------------------------------------------------------------------ */
    /* 2. Simple in-memory rate limiting (50 req / 60 s per user).        */
    /* ------------------------------------------------------------------ */
    const MAX_REQ = 50
    const WINDOW_MS = 60_000
    const now = Date.now()
    type Bucket = { count: number; reset: number }
    // global store lives for process lifetime (OK for serverless edge/runtime)
    const rl = (globalThis as any).__analysisRateLimit as Map<string, Bucket> | undefined
    const rateLimiter: Map<string, Bucket> =
      rl || ((globalThis as any).__analysisRateLimit = new Map())

    const bucket = rateLimiter.get(userId) ?? { count: 0, reset: now + WINDOW_MS }
    if (now > bucket.reset) {
      bucket.count = 0
      bucket.reset = now + WINDOW_MS
    }
    bucket.count += 1
    rateLimiter.set(userId, bucket)
    if (bucket.count > MAX_REQ) {
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    const sessionId = req.headers['x-auth-session-id'] as string | undefined
    console.log('[analyze] Authenticated user:', userId)

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { text } = req.body
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' })
    }
    // enforce a minimum length so very short strings (e.g. “Hi”) are rejected.
    if (text.trim().length < 10) {
      return res
        .status(400)
        .json({ error: 'Text must be at least 10 characters long' })
    }

    // Step 20: Check cache first
    // Use the shared singleton cache
    const { getAnalysisCache } = await import('../../lib/cache/RedisCache')
    const cache = getAnalysisCache()
    
    const cachedResult = await cache.getCachedResult(text, userId)
    if (cachedResult) {
      return res.status(200).json({
        ...cachedResult,
        fromCache: true,
        message: 'Analysis completed (cached)',
      })
    }

    // Step 19: Orchestrate rule processing
    const { randomUUID } = await import('crypto')
    const jobId = randomUUID()

    // -------------------------------------------------------------------
    // Notify clients that analysis has started (0 % progress)
    // -------------------------------------------------------------------
    notifyAnalysisProgress(jobId, 0, [], 'processing')

    const [{ SimpleRuleProcessor }, { AIRuleProcessor }] = await Promise.all([
      import('../../lib/rules/SimpleRuleProcessor'),
      import('../../lib/rules/AIRuleProcessor'),
    ])

    const g = globalThis as any
    g.__simpleProcessor = g.__simpleProcessor || new SimpleRuleProcessor()
    g.__aiProcessor = g.__aiProcessor || new AIRuleProcessor()
    const simpleProcessor = g.__simpleProcessor as InstanceType<typeof SimpleRuleProcessor>
    const aiProcessor = g.__aiProcessor as InstanceType<typeof AIRuleProcessor>

    // Run simple rules first (synchronous)
    const simpleMatches = await simpleProcessor.processText(text)

    // ------------- push first progress packet (50 %) -------------------
    notifyAnalysisProgress(jobId, 50, simpleMatches, 'processing')

    // Run AI rules (since queue not implemented yet, run locally)
    console.log('[analyze] Running AI rules locally (queue not available)')
    const aiMatches = await aiProcessor.processText(text)
    
    const allMatches = [...simpleMatches, ...aiMatches]

    const result = {
      message: 'Analysis completed',
      userId,
      sessionId,
      jobId,
      textLength: text.length,
      matchCount: allMatches.length,
      matches: allMatches,
      status: 'completed',
      fromCache: false,
    }

    // Cache the result
    await cache.cacheResult(text, userId, result)

    // ---------------------- analysis complete --------------------------
    notifyAnalysisProgress(jobId, 100, allMatches, 'complete')

    res.status(200).json(result)
  } catch (err) {
    console.error(err)
    // Try to emit an error event if we have a jobId in scope
    // (use optional chaining to avoid reference errors)
    // eslint-disable-next-line no-unsafe-optional-chaining
    try {
      // @ts-ignore – jobId may not exist if failure occurred pre-creation
      if (jobId) notifyAnalysisProgress(jobId, 0, [], 'error')
    } catch (_) {
      /* ignore */
    }
    res.status(500).json({ error: 'Analysis failed' })
  }
}
