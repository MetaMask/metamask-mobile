/**
 * Simple in-memory cache with TTL for Meld API responses.
 *
 * Countries, currencies, and payment methods rarely change —
 * Meld recommends caching for 1 week.
 */

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MeldApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = ONE_WEEK_MS): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const meldCache = new MeldApiCache();
export { ONE_WEEK_MS };
export default MeldApiCache;
