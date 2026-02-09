/**
 * HyperliquidHIP4Service
 *
 * Shared data service for Hyperliquid HIP-4 Event Futures / Prediction Markets.
 * Fetches outcome markets and prediction questions from the spotMeta API,
 * maps them to normalized internal types, and provides caching.
 *
 * Used by both:
 * - HyperliquidPredictProvider (Predict tab)
 * - Perps market list (Perps tab, "Predictions" filter)
 *
 * Data flow:
 * spotMeta API (outcomes[] + questions[]) -> HyperliquidHIP4Service -> normalized HIP4Market[]
 */

import {
  HIP4MarketStatus,
  type HIP4Market,
  type HIP4MarketOutcome,
  type HIP4MarketSide,
  type HIP4Outcome,
  type HIP4Question,
  type SpotMetaOutcomeData,
  type SpotUniverseEntry,
} from '../types/hip4-types';
import { HIP4_CONFIG } from '../constants/hyperLiquidConfig';
import {
  Recurrence,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
} from '../../Predict/types';

/**
 * Logger interface matching the existing PerpsPlatformDependencies debugLogger.
 */
interface Logger {
  log: (message: string, ...args: unknown[]) => void;
}

/**
 * Info client interface for Hyperliquid API calls.
 * Matches the subset of InfoClient used by this service.
 */
interface InfoClient {
  spotMeta: () => Promise<{
    tokens: { name: string; index: number }[];
    universe: {
      name: string;
      tokens: number[];
      index: number;
      isCanonical: boolean;
    }[];
    outcomes?: HIP4Outcome[];
    questions?: HIP4Question[];
  }>;
  allMids: () => Promise<Record<string, string>>;
}

/**
 * Cached data structure for spotMeta outcome markets.
 */
interface CachedSpotMetaOutcomes {
  data: SpotMetaOutcomeData;
  timestamp: number;
}

/**
 * Cached price data for outcome tokens.
 */
interface CachedPrices {
  /** Map of spot token symbol -> mid price string */
  prices: Record<string, string>;
  timestamp: number;
}

export class HyperliquidHIP4Service {
  private readonly logger: Logger;
  private cachedOutcomes: CachedSpotMetaOutcomes | null = null;
  private cachedPrices: CachedPrices | null = null;
  private pendingFetchPromise: Promise<SpotMetaOutcomeData> | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Fetches HIP-4 outcome markets and questions from the spotMeta API.
   * Results are cached for `HIP4_CONFIG.SpotMetaCacheTtlMs`.
   *
   * @param infoClient - The Hyperliquid InfoClient to use for API calls
   * @returns Outcome markets and questions data
   */
  async fetchOutcomeMarkets(
    infoClient: InfoClient,
  ): Promise<SpotMetaOutcomeData> {
    // Check cache
    if (
      this.cachedOutcomes &&
      !this.isCacheExpired(
        this.cachedOutcomes.timestamp,
        HIP4_CONFIG.SpotMetaCacheTtlMs,
      )
    ) {
      this.logger.log('[HIP4Service] Using cached outcome markets', {
        outcomesCount: this.cachedOutcomes.data.outcomes.length,
        questionsCount: this.cachedOutcomes.data.questions.length,
      });
      return this.cachedOutcomes.data;
    }

    // Deduplicate concurrent requests
    if (this.pendingFetchPromise) {
      return this.pendingFetchPromise;
    }

    this.pendingFetchPromise = this.doFetchOutcomeMarkets(infoClient);

    try {
      const result = await this.pendingFetchPromise;
      return result;
    } finally {
      this.pendingFetchPromise = null;
    }
  }

  /**
   * Fetches mid-prices for all spot tokens (used for outcome token pricing).
   *
   * @param infoClient - The Hyperliquid InfoClient to use for API calls
   * @returns Map of token symbol -> mid price
   */
  async fetchPrices(infoClient: InfoClient): Promise<Record<string, string>> {
    if (
      this.cachedPrices &&
      !this.isCacheExpired(
        this.cachedPrices.timestamp,
        HIP4_CONFIG.PriceCacheTtlMs,
      )
    ) {
      return this.cachedPrices.prices;
    }

    try {
      const mids = await infoClient.allMids();
      this.cachedPrices = {
        prices: mids,
        timestamp: Date.now(),
      };
      return mids;
    } catch (error) {
      this.logger.log('[HIP4Service] Failed to fetch prices', error);
      // Return cached prices if available, even if expired
      if (this.cachedPrices) {
        return this.cachedPrices.prices;
      }
      throw error;
    }
  }

  /**
   * Maps raw spotMeta outcome data to enriched HIP4Market objects.
   * Combines questions with their outcomes and adds live pricing.
   *
   * @param data - Raw outcome data from spotMeta
   * @param prices - Optional price data for outcome tokens
   * @returns Array of enriched HIP4Market objects
   */
  mapToHIP4Markets(
    data: SpotMetaOutcomeData,
    prices?: Record<string, string>,
  ): HIP4Market[] {
    const { outcomes, questions, universe } = data;

    // Build a tokenIndex -> pair name map from universe data.
    // In allMids, HIP-4 outcome tokens are keyed by their spot pair name
    // (e.g., "@100000100"), not by "@{tokenIndex}".
    const tokenToPairName = new Map<number, string>();
    if (universe) {
      for (const entry of universe) {
        // The first token in the pair is the outcome token
        if (entry.tokens.length > 0) {
          tokenToPairName.set(entry.tokens[0], entry.name);
        }
      }
    }

    return questions.map((question) => {
      const marketOutcomes = question.namedOutcomes
        .map((outcomeIdx) => outcomes.find((o) => o.outcome === outcomeIdx))
        .filter((o): o is HIP4Outcome => o !== undefined)
        .map((outcome) => this.mapOutcome(outcome, prices, tokenToPairName));

      return {
        id: `hip4-${question.question}`,
        questionId: question.question,
        title: question.name,
        description: question.description,
        status: HIP4MarketStatus.ACTIVE, // Default to active; will be refined with API data
        outcomes: marketOutcomes,
        fallbackOutcome: question.fallbackOutcome,
        resolution: null,
        volume24h: 0, // Will be populated from additional API calls
        endDate: null, // Will be populated from market metadata
        tags: this.inferTags(question.name, question.description),
      };
    });
  }

  /**
   * Maps HIP-4 markets to the PredictMarket type used by the Predict tab.
   *
   * @param markets - Enriched HIP-4 markets
   * @returns Array of PredictMarket objects compatible with the Predict tab UI
   */
  mapToPredictMarkets(markets: HIP4Market[]): PredictMarket[] {
    return markets.map((market) => this.mapToPredictMarket(market));
  }

  /**
   * Maps a single HIP-4 market to a PredictMarket.
   */
  mapToPredictMarket(market: HIP4Market): PredictMarket {
    const outcomes: PredictOutcome[] = market.outcomes.map((outcome) => {
      const tokens: PredictOutcomeToken[] = outcome.sides.map((side) => ({
        id: `${side.tokenIndex}`,
        title: side.name,
        price: side.price,
      }));

      return {
        id: `${outcome.outcomeId}`,
        providerId: HIP4_CONFIG.ProviderId,
        marketId: market.id,
        title: outcome.name,
        description: outcome.description,
        image: '', // HIP-4 markets don't have per-outcome images
        status: this.mapMarketStatus(market.status),
        tokens,
        volume: market.volume24h,
        groupItemTitle: outcome.name,
      };
    });

    return {
      id: market.id,
      providerId: HIP4_CONFIG.ProviderId,
      slug: market.id,
      title: market.title,
      description: market.description,
      endDate: market.endDate ?? undefined,
      image: '', // HIP-4 markets use text-based display
      status: this.mapMarketStatus(market.status),
      recurrence: Recurrence.NONE,
      category: this.inferCategory(market),
      tags: market.tags,
      outcomes,
      liquidity: 0, // Will be populated from order book data
      volume: market.volume24h,
    };
  }

  /**
   * Clears all cached data.
   */
  clearCache(): void {
    this.cachedOutcomes = null;
    this.cachedPrices = null;
    this.pendingFetchPromise = null;
  }

  // ---- Private Methods ----

  private async doFetchOutcomeMarkets(
    infoClient: InfoClient,
  ): Promise<SpotMetaOutcomeData> {
    try {
      const spotMeta = await infoClient.spotMeta();

      // Collect all token indices from HIP-4 outcomes so we can filter the
      // universe to only the entries we need for price lookups.
      const outcomes = spotMeta.outcomes ?? [];
      const outcomeTokenIndices = new Set<number>();
      for (const outcome of outcomes) {
        for (const side of outcome.sideSpecs) {
          outcomeTokenIndices.add(side.token);
        }
      }

      // Filter universe to entries containing HIP-4 outcome tokens.
      // Each entry maps a token index to the pair name used in allMids.
      const universe: SpotUniverseEntry[] = (spotMeta.universe ?? [])
        .filter((entry) =>
          entry.tokens.some((t: number) => outcomeTokenIndices.has(t)),
        )
        .map((entry) => ({
          name: entry.name,
          tokens: entry.tokens,
          index: entry.index,
          isCanonical: entry.isCanonical,
        }));

      const data: SpotMetaOutcomeData = {
        outcomes,
        questions: spotMeta.questions ?? [],
        universe,
      };

      this.cachedOutcomes = {
        data,
        timestamp: Date.now(),
      };

      this.logger.log('[HIP4Service] Fetched outcome markets', {
        outcomesCount: data.outcomes.length,
        questionsCount: data.questions.length,
        universeEntries: universe.length,
      });

      return data;
    } catch (error) {
      this.logger.log('[HIP4Service] Failed to fetch outcome markets', error);

      // Return cached data if available, even if expired
      if (this.cachedOutcomes) {
        this.logger.log('[HIP4Service] Returning stale cached data');
        return this.cachedOutcomes.data;
      }

      throw error;
    }
  }

  private mapOutcome(
    outcome: HIP4Outcome,
    prices?: Record<string, string>,
    tokenToPairName?: Map<number, string>,
  ): HIP4MarketOutcome {
    const sides: HIP4MarketSide[] = outcome.sideSpecs.map((spec) => {
      const price = prices
        ? this.getTokenPrice(spec.token, prices, tokenToPairName)
        : 0;
      return {
        name: spec.name,
        tokenIndex: spec.token,
        price,
        bestBid: price, // Simplified; real bid/ask from l2Book
        bestAsk: price, // Simplified; real bid/ask from l2Book
      };
    });

    return {
      outcomeId: outcome.outcome,
      name: outcome.name,
      description: outcome.description,
      sides,
    };
  }

  /**
   * Gets the price for a spot token from the allMids response.
   *
   * HIP-4 outcome tokens use spot pair names (e.g., "@100000100") as allMids keys,
   * NOT the token index directly. The universe array maps token indices to pair names.
   *
   * Lookup order:
   * 1. Universe pair name (primary for HIP-4 tokens)
   * 2. Standard spot token key `@{index}` (fallback for regular tokens)
   *
   * Falls back to 0 if no price found (market may not have active trading yet).
   */
  private getTokenPrice(
    tokenIndex: number,
    prices: Record<string, string>,
    tokenToPairName?: Map<number, string>,
  ): number {
    // Primary: look up via universe pair name (correct for HIP-4 outcome tokens)
    if (tokenToPairName) {
      const pairName = tokenToPairName.get(tokenIndex);
      if (pairName && prices[pairName] !== undefined) {
        const parsed = parseFloat(prices[pairName]);
        return isNaN(parsed) ? 0 : parsed;
      }
    }

    // Fallback: try standard spot token key "@{index}"
    const spotKey = `@${tokenIndex}`;
    const spotPrice = prices[spotKey];
    if (spotPrice) {
      const parsed = parseFloat(spotPrice);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  private mapMarketStatus(
    status: HIP4MarketStatus,
  ): 'open' | 'closed' | 'resolved' {
    switch (status) {
      case HIP4MarketStatus.ACTIVE:
      case HIP4MarketStatus.AUCTION:
      case HIP4MarketStatus.UPCOMING:
        return 'open';
      case HIP4MarketStatus.RESOLVED:
        return 'resolved';
      default:
        return 'open';
    }
  }

  private inferCategory(
    market: HIP4Market,
  ): 'trending' | 'new' | 'sports' | 'crypto' | 'politics' | 'hot' {
    const text = `${market.title} ${market.description}`.toLowerCase();

    if (
      text.includes('btc') ||
      text.includes('eth') ||
      text.includes('crypto') ||
      text.includes('bitcoin') ||
      text.includes('ethereum')
    ) {
      return 'crypto';
    }
    if (
      text.includes('election') ||
      text.includes('president') ||
      text.includes('vote') ||
      text.includes('politics')
    ) {
      return 'politics';
    }
    if (
      text.includes('nfl') ||
      text.includes('nba') ||
      text.includes('super bowl') ||
      text.includes('game') ||
      text.includes('match')
    ) {
      return 'sports';
    }

    // Default to trending for uncategorized markets
    return 'trending';
  }

  /**
   * Infers tags from market title and description.
   */
  private inferTags(title: string, description: string): string[] {
    const tags: string[] = ['hyperliquid', 'hip-4'];
    const text = `${title} ${description}`.toLowerCase();

    if (text.includes('btc') || text.includes('bitcoin')) tags.push('bitcoin');
    if (text.includes('eth') || text.includes('ethereum'))
      tags.push('ethereum');
    if (text.includes('crypto')) tags.push('crypto');
    if (text.includes('election') || text.includes('politics'))
      tags.push('politics');
    if (text.includes('sport') || text.includes('nfl') || text.includes('nba'))
      tags.push('sports');

    return tags;
  }

  private isCacheExpired(timestamp: number, ttlMs: number): boolean {
    return Date.now() - timestamp > ttlMs;
  }
}
