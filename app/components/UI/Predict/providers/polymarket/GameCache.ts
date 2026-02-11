import { GameUpdate, PredictMarket } from '../../types';
import { parseScore } from '../../utils/gameParser';

const CACHE_TTL_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

interface CacheEntry {
  data: GameUpdate;
  lastUpdate: number;
}

export class GameCache {
  private static instance: GameCache | null = null;
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): GameCache {
    GameCache.instance ??= new GameCache();
    return GameCache.instance;
  }

  static resetInstance(): void {
    if (GameCache.instance) {
      GameCache.instance.cleanup();
      GameCache.instance = null;
    }
  }

  updateGame(gameId: string, update: GameUpdate): void {
    this.cache.set(gameId, {
      data: update,
      lastUpdate: Date.now(),
    });
  }

  getGame(gameId: string): GameUpdate | null {
    const entry = this.cache.get(gameId);
    if (!entry) {
      return null;
    }

    const isStale = Date.now() - entry.lastUpdate > CACHE_TTL_MS;
    if (isStale) {
      this.cache.delete(gameId);
      return null;
    }

    return entry.data;
  }

  overlayOnMarket(market: PredictMarket): PredictMarket {
    if (!market.game) {
      return market;
    }

    const cachedUpdate = this.getGame(market.game.id);
    if (!cachedUpdate) {
      return market;
    }

    return {
      ...market,
      game: {
        ...market.game,
        score: parseScore(cachedUpdate.score),
        elapsed: cachedUpdate.elapsed || null,
        period: cachedUpdate.period || null,
        status: cachedUpdate.status,
        turn: cachedUpdate.turn,
      },
    };
  }

  overlayOnMarkets(markets: PredictMarket[]): PredictMarket[] {
    return markets.map((m) => this.overlayOnMarket(m));
  }

  pruneStaleEntries(): void {
    const now = Date.now();
    for (const [gameId, entry] of this.cache.entries()) {
      if (now - entry.lastUpdate > CACHE_TTL_MS) {
        this.cache.delete(gameId);
      }
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.pruneStaleEntries();
    }, CLEANUP_INTERVAL_MS);
  }

  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  cleanup(): void {
    this.stopCleanupInterval();
    this.cache.clear();
  }

  clear(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCachedGameIds(): string[] {
    return Array.from(this.cache.keys());
  }
}
