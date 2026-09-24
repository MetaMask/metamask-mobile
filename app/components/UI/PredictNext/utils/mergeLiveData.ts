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

const GAME_LIVE_PATCH_FIELDS = ['status', 'score', 'period', 'clock'] as const;

type GameLivePatchField = (typeof GAME_LIVE_PATCH_FIELDS)[number];

/** When each carried live field was last seen on the wire. */
export type PredictGameLiveObservedAtByField = Partial<
  Record<GameLivePatchField, PredictGameLive['observedAt']>
>;

export type AccumulatedPredictGameLive = PredictGameLive & {
  observedAtByField: PredictGameLiveObservedAtByField;
};

type GameLivePatch = Pick<
  PredictGameLive,
  'status' | 'score' | 'period' | 'clock' | 'observedAt'
> & {
  observedAtByField?: PredictGameLiveObservedAtByField;
};

type GameLiveFrame = PredictGameLive & GameLivePatch;

const observedAtByPresentFields = (
  live: GameLivePatch,
): PredictGameLiveObservedAtByField => {
  const times: PredictGameLiveObservedAtByField = {};
  GAME_LIVE_PATCH_FIELDS.forEach((field) => {
    if (live[field] !== undefined) {
      times[field] = live.observedAt;
    }
  });
  return times;
};

const fieldTimesOf = (live: GameLivePatch): PredictGameLiveObservedAtByField =>
  live.observedAtByField ?? observedAtByPresentFields(live);

const observedAtForField = (
  live: GameLivePatch,
  field: GameLivePatchField,
): string | undefined => fieldTimesOf(live)[field];

/** True when `incoming` is strictly older than `previous`. */
export const isOlderLiveFrame = (
  incoming: { observedAt: string },
  previous: { observedAt: string },
): boolean => Date.parse(incoming.observedAt) < Date.parse(previous.observedAt);

/**
 * Accumulates two streamed Game patches. Omitted fields stay as they were on
 * `previous`; a clock-only or score-only frame must not drop status, score,
 * period, or clock that an earlier live frame already carried.
 *
 * Each carried field keeps the `observedAt` from the frame that last set it.
 * Stamping the incoming time onto omitted fields would make a later clock tick
 * look newer than a REST refetch that already replaced those values.
 *
 * Returns `undefined` when `incoming` is older than `previous`.
 */
export const mergeGameLiveFrames = (
  previous: GameLiveFrame | undefined,
  incoming: GameLiveFrame,
): AccumulatedPredictGameLive | undefined => {
  if (previous && isOlderLiveFrame(incoming, previous)) {
    return undefined;
  }

  const incomingTimes = fieldTimesOf(incoming);
  if (!previous) {
    return {
      ...incoming,
      observedAtByField: incomingTimes,
    };
  }

  const previousTimes = fieldTimesOf(previous);
  return {
    ...previous,
    venueId: incoming.venueId,
    eventId: incoming.eventId,
    type: incoming.type,
    status: incoming.status ?? previous.status,
    score: incoming.score ?? previous.score,
    period: incoming.period ?? previous.period,
    clock: incoming.clock ?? previous.clock,
    observedAt: incoming.observedAt,
    observedAtByField: {
      status: incomingTimes.status ?? previousTimes.status,
      score: incomingTimes.score ?? previousTimes.score,
      period: incomingTimes.period ?? previousTimes.period,
      clock: incomingTimes.clock ?? previousTimes.clock,
    },
  };
};

/**
 * Patches a streamed Game frame onto the REST-fetched Game.
 *
 * Sport- and venue-agnostic: the frame already uses `PredictGame`'s field
 * names, so this is a spread with two guards — a field older than what the
 * read model already shows is left on REST, and a status outside the client's
 * vocabulary falls back to the current one rather than corrupting it.
 *
 * `live` must already be the accumulated patch for this Event (see
 * `mergeGameLiveFrames`). Merging a clock-only frame directly onto REST
 * would restore snapshot values for every omitted field.
 */
export const mergeGameLiveUpdate = (
  current: PredictGame,
  live: GameLivePatch,
): PredictGame | undefined => {
  const shouldApplyLiveField = (
    field: GameLivePatchField,
    liveValue: unknown,
  ): boolean => {
    if (liveValue === undefined) {
      return false;
    }
    const fieldAt = observedAtForField(live, field);
    return (
      fieldAt !== undefined &&
      !isOlderLiveFrame({ observedAt: fieldAt }, current)
    );
  };

  const applyStatus = shouldApplyLiveField('status', live.status);
  const applyScore = shouldApplyLiveField('score', live.score);
  const applyPeriod = shouldApplyLiveField('period', live.period);
  const applyClock = shouldApplyLiveField('clock', live.clock);

  if (!applyStatus && !applyScore && !applyPeriod && !applyClock) {
    return undefined;
  }

  return {
    ...current,
    status: applyStatus
      ? (asGameStatus(live.status) ?? current.status)
      : current.status,
    score: applyScore ? live.score : current.score,
    period: applyPeriod ? live.period : current.period,
    clock: applyClock ? live.clock : current.clock,
    observedAt: live.observedAt,
  };
};

/**
 * Patches a streamed quote onto the REST-fetched market.
 *
 * Outcomes match by id. A quote is a full price snapshot, so a side the quote
 * omits is cleared, not kept: it means nobody is quoting right now. The same
 * holds for `lastPrice`, which is absent until the Market trades. `label`
 * and `gameSelection` are REST-only and survive untouched.
 *
 * No staleness guard against `current.updatedAt`: REST's value is the venue's
 * market-metadata update time, not a price time, so it says nothing about
 * whether the quote is newer. Ordering between quotes is the caller's job.
 */
export const mergeMarketQuote = (
  current: PredictMarket,
  quote: Pick<PredictQuote, 'outcomes' | 'lastPrice' | 'volume' | 'updatedAt'>,
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

  const lastPrice = quote.lastPrice;
  const volume = quote.volume ?? current.volume;
  const updatedAt = quote.updatedAt;
  const pricesUnchanged = current.outcomes.every((outcome, index) => {
    const next = outcomes[index];
    return (
      next !== undefined &&
      outcome.bidPrice === next.bidPrice &&
      outcome.askPrice === next.askPrice
    );
  });

  if (
    pricesUnchanged &&
    current.lastPrice === lastPrice &&
    current.volume === volume &&
    current.updatedAt === updatedAt
  ) {
    return current;
  }

  return {
    ...current,
    outcomes,
    lastPrice,
    volume,
    updatedAt,
  };
};
