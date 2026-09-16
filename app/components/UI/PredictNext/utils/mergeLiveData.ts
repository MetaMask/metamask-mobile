import type { PredictGameLive, PredictQuote } from '../contracts/v1/liveData';
import type {
  PredictGame,
  PredictGameStatus,
  PredictMarket,
  PredictOutcome,
} from '../types';

const GAME_STATUSES: ReadonlySet<string> = new Set<PredictGameStatus>([
  'scheduled',
  'in_progress',
  'delayed',
  'suspended',
  'postponed',
  'completed',
  'canceled',
]);

const asGameStatus = (
  value: string | undefined,
): PredictGameStatus | undefined =>
  value !== undefined && GAME_STATUSES.has(value)
    ? (value as PredictGameStatus)
    : undefined;

/** True when `incoming` is strictly older than `previous`. */
export const isOlderLiveFrame = (
  incoming: { observedAt: string },
  previous: { observedAt: string },
): boolean => Date.parse(incoming.observedAt) < Date.parse(previous.observedAt);

/**
 * Patches a streamed Game frame onto the REST-fetched Game.
 *
 * Sport- and venue-agnostic: the frame already uses `PredictGame`'s field
 * names, so this is a spread with two guards — a frame older than what the
 * read model already shows is dropped, and a status outside the client's
 * vocabulary falls back to the current one rather than corrupting it.
 */
export const mergeGameLiveUpdate = (
  current: PredictGame,
  live: Pick<
    PredictGameLive,
    'status' | 'score' | 'period' | 'clock' | 'observedAt'
  >,
): PredictGame | undefined => {
  if (isOlderLiveFrame(live, current)) {
    return undefined;
  }

  return {
    ...current,
    status: asGameStatus(live.status) ?? current.status,
    score: live.score ?? current.score,
    period: live.period ?? current.period,
    clock: live.clock ?? current.clock,
    observedAt: live.observedAt,
  };
};

/**
 * Patches a streamed quote onto the REST-fetched market.
 *
 * Outcomes match by id. A quote is a full price snapshot, so a side the quote
 * omits is cleared, not kept: it means nobody is quoting right now. `label`
 * and `gameSelection` are REST-only and survive untouched.
 *
 * No staleness guard against `current.updatedAt`: REST's value is the venue's
 * market-metadata update time, not a price time, so it says nothing about
 * whether the quote is newer. Ordering between quotes is the caller's job.
 */
export const mergeMarketQuote = (
  current: PredictMarket,
  quote: Pick<PredictQuote, 'outcomes' | 'volume' | 'updatedAt'>,
): PredictMarket => {
  const outcomes = current.outcomes.map((outcome): PredictOutcome => {
    const streamed = quote.outcomes.find(({ id }) => id === outcome.id);
    return streamed
      ? {
          ...outcome,
          bidPrice: streamed.bidPrice,
          askPrice: streamed.askPrice,
        }
      : outcome;
  }) as [PredictOutcome, PredictOutcome];

  return {
    ...current,
    outcomes,
    volume: quote.volume ?? current.volume,
    updatedAt: quote.updatedAt,
  };
};
