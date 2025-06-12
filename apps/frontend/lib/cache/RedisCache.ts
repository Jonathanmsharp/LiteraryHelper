import crypto from 'crypto';

export interface CacheInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  exists(key: string): Promise<boolean>;
}

class MemoryCache implements CacheInterface {
  private cache = new Map<string, { value: string; expires: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string, ttl = 900): Promise<void> {
    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expires });
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }
}

export class AnalysisCache {
  private cache: CacheInterface;
  private readonly TTL = 15 * 60; // 15 minutes

  constructor() {
    // Use memory cache for now (Redis integration deferred)
    this.cache = new MemoryCache();
    console.log('[AnalysisCache] Using memory cache');
  }

  getCacheKey(text: string, userId: string): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    return `analysis:${userId}:${hash}`;
  }

  async getCachedResult(text: string, userId: string): Promise<any | null> {
    try {
      const key = this.getCacheKey(text, userId);
      const cached = await this.cache.get(key);
      
      if (cached) {
        console.log('[AnalysisCache] Cache HIT for', key.substring(0, 20) + '...');
        return JSON.parse(cached);
      }
      
      console.log('[AnalysisCache] Cache MISS for', key.substring(0, 20) + '...');
      return null;
    } catch (err) {
      console.warn('[AnalysisCache] Get error:', err);
      return null;
    }
  }

  async cacheResult(text: string, userId: string, result: any): Promise<void> {
    try {
      const key = this.getCacheKey(text, userId);
      await this.cache.set(key, JSON.stringify(result), this.TTL);
      console.log('[AnalysisCache] Cached result for', key.substring(0, 20) + '...');
    } catch (err) {
      console.warn('[AnalysisCache] Cache error:', err);
    }
  }
}

let globalCache: AnalysisCache | null = null;

export function getAnalysisCache(): AnalysisCache {
  if (!globalCache) {
    globalCache = new AnalysisCache();
  }
  return globalCache;
}
