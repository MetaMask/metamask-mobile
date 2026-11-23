import type { PredictEvent } from '../../types';
import type { PredictTrendingMarket } from '../types';

const NEXT_EVENT = Symbol('PredictTrendingNextEvent');

interface NextTrendingMarket {
  readonly id: string;
  readonly [NEXT_EVENT]: PredictEvent;
}

/**
 * A next Venue's Event behind the opaque public type. The Event keeps its
 * Venue, so a market minted on one Venue can never act on another.
 */
export const toNextTrendingMarket = (
  event: PredictEvent,
): PredictTrendingMarket =>
  ({
    id: event.id,
    [NEXT_EVENT]: event,
  }) satisfies NextTrendingMarket as unknown as PredictTrendingMarket;

/**
 * The Event a market minted by {@link toNextTrendingMarket} carries, or
 * undefined for a legacy market. Components render on this, not on the
 * Active Venue: only the trending hooks mint markets.
 */
export const readNextTrendingEvent = (
  market: PredictTrendingMarket,
): PredictEvent | undefined =>
  (market as Partial<NextTrendingMarket>)[NEXT_EVENT];
