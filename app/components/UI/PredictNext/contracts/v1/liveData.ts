import {
  array,
  boolean,
  enums,
  mask,
  number,
  optional,
  string,
  type Struct,
  type as structType,
  tuple,
  union,
} from '@metamask/superstruct';
import { amount, decimal, timestamp } from './primitives';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictGame,
  PredictGameStatus,
  PredictOutcomeSide,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';

export type PredictLiveDataTopic = 'game' | 'market' | 'index';

/**
 * A streamed Game patch: identity plus the volatile half of `PredictGame`,
 * under `PredictGame`'s own field names. The static half (teams, logos,
 * colors) never changes mid-game and stays on the REST Event. Nothing
 * venue-native travels here; every field is canonical.
 *
 * Every canonical field except `observedAt` is optional — absent means
 * "unchanged". `status` is a plain string here and narrowed at merge time so
 * an added server status cannot reject a whole frame.
 */
export interface PredictGameLive {
  venueId: PredictVenueId;
  eventId: PredictEntityId;
  type: string;
  status?: PredictGameStatus | (string & {});
  score?: NonNullable<PredictGame['score']>;
  period?: string;
  clock?: string;
  observedAt: PredictTimestamp;
}

/** A streamed outcome: the canonical `PredictOutcome` minus `label`. */
export interface PredictQuoteOutcome {
  id: PredictEntityId;
  side: PredictOutcomeSide;
  bidPrice?: PredictDecimal;
  askPrice?: PredictDecimal;
}

/**
 * A streamed price snapshot for one market: identity plus the volatile half
 * of `PredictMarket`, under `PredictMarket`'s own field names. Outcome ids
 * are byte-identical to the REST ones, so prices patch on by `outcomes[].id`.
 *
 * Unlike a Game frame this is a full snapshot, not a patch: an outcome with no
 * `bidPrice` means that side of the book is empty right now.
 */
export interface PredictQuote {
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  outcomes: readonly [PredictQuoteOutcome, PredictQuoteOutcome];
  /** Last traded price, yes-side. Absent when the Market has never traded. */
  lastPrice?: PredictDecimal;
  volume?: string;
  updatedAt: PredictTimestamp;
}

/** One point of the window series. `value` is a decimal string. */
export interface PredictIndexPoint {
  time: PredictTimestamp;
  value: string;
}

/**
 * The 60-second average that settles an Up/Down window, as it builds up in
 * the last minute. `final` is `true` at the close tick, with 60 samples.
 */
export interface PredictIndexSettlementAverage {
  value: string;
  samples: number;
  final: boolean;
}

/**
 * A streamed index tick for one Event (about one per second): the value the
 * app shows (`average60s`) and the raw tick (`value`). Decimals are strings.
 */
export interface PredictIndexLive {
  venueId: PredictVenueId;
  eventId: PredictEntityId;
  coin: string;
  /** The 60-second average. This is the value the app shows and charts. */
  average60s: string;
  /** The raw index tick. Absent until the first live tick after a snapshot. */
  value?: string;
  observedAt: PredictTimestamp;
  /** Only in the last minute of the window. */
  settlementAverage?: PredictIndexSettlementAverage;
}

/**
 * The window so far, sent once when an Event is subscribed. `points` use the
 * same series as `average60s`, thinned to about one point per 5 seconds, in
 * time order.
 */
export interface PredictIndexSnapshot extends PredictIndexLive {
  points: readonly PredictIndexPoint[];
}

/** An `error` frame about an `index` subscription. */
export interface PredictIndexError {
  venueId: PredictVenueId;
  eventId: PredictEntityId;
  /** For example `no_live_data` or `upstream_stale`. */
  code: string;
  message: string;
}

export interface PredictLiveDataTopicLimits {
  maxPerConnection: number;
  maxPerMessage: number;
}

export type PredictLiveDataServerFrame =
  | {
      type: 'welcome';
      protocol: number;
      limits?: Partial<
        Record<PredictLiveDataTopic, PredictLiveDataTopicLimits>
      >;
    }
  | {
      type: 'game_snapshot' | 'game';
      game: PredictGameLive;
    }
  | {
      type: 'quote_snapshot' | 'quote';
      quote: PredictQuote;
    }
  | {
      type: 'index_snapshot';
      index: PredictIndexSnapshot;
    }
  | {
      type: 'index';
      index: PredictIndexLive;
    }
  | {
      type: 'subscribed' | 'unsubscribed';
      topic: 'game' | 'index';
      venueId: PredictVenueId;
      events: string[];
      /**
       * Only on an `unsubscribed` frame the server sent on its own (for
       * example `window_closed` or `unavailable`). A plain reply to a client
       * `unsubscribe` has no reason.
       */
      reason?: string;
    }
  | {
      type: 'subscribed' | 'unsubscribed';
      topic: 'market';
      venueId: PredictVenueId;
      markets: string[];
    }
  | {
      type: 'error';
      code: string;
      /**
       * Set to `index` on every error of the `index` topic. Errors of other
       * topics and connection-level errors carry no topic.
       */
      topic?: string;
      message: string;
      events?: string[];
      markets?: string[];
    };

// The server sends more fields than mobile reads (`welcome` carries heartbeat
// and limits, for example). `mask` does not strip unknown keys inside a union,
// so these must tolerate extra properties rather than reject the frame.
const gameLive = structType({
  venueId: string(),
  eventId: string(),
  type: string(),
  // Deliberately `string()`, not `enums(...)`: an added server status would
  // otherwise reject the frame and blackhole live updates. Narrow at merge.
  status: optional(string()),
  score: optional(structType({ home: string(), away: string() })),
  period: optional(string()),
  clock: optional(string()),
  observedAt: timestamp,
});

const quoteOutcome = structType({
  id: string(),
  side: enums(['yes', 'no'] as const),
  bidPrice: optional(decimal),
  askPrice: optional(decimal),
});

const quote = structType({
  venueId: string(),
  marketId: string(),
  outcomes: tuple([quoteOutcome, quoteOutcome]),
  lastPrice: optional(decimal),
  volume: optional(string()),
  updatedAt: timestamp,
});

const indexSettlementAverage = structType({
  value: amount,
  samples: number(),
  final: boolean(),
});

const indexLive = structType({
  venueId: string(),
  eventId: string(),
  coin: string(),
  average60s: amount,
  value: optional(amount),
  observedAt: timestamp,
  settlementAverage: optional(indexSettlementAverage),
});

const indexSnapshot = structType({
  venueId: string(),
  eventId: string(),
  coin: string(),
  average60s: amount,
  value: optional(amount),
  observedAt: timestamp,
  settlementAverage: optional(indexSettlementAverage),
  points: array(structType({ time: timestamp, value: amount })),
});

const topicLimits = structType({
  maxPerConnection: number(),
  maxPerMessage: number(),
});

const serverFrame = union([
  structType({
    type: enums(['welcome'] as const),
    protocol: number(),
    limits: optional(
      structType({
        game: optional(topicLimits),
        market: optional(topicLimits),
        index: optional(topicLimits),
      }),
    ),
  }),
  structType({
    type: enums(['game_snapshot', 'game'] as const),
    game: gameLive,
  }),
  structType({
    type: enums(['quote_snapshot', 'quote'] as const),
    quote,
  }),
  structType({
    type: enums(['index_snapshot'] as const),
    index: indexSnapshot,
  }),
  structType({
    type: enums(['index'] as const),
    index: indexLive,
  }),
  structType({
    type: enums(['subscribed', 'unsubscribed'] as const),
    topic: enums(['game', 'index'] as const),
    venueId: string(),
    events: array(string()),
    reason: optional(string()),
  }),
  structType({
    type: enums(['subscribed', 'unsubscribed'] as const),
    topic: enums(['market'] as const),
    venueId: string(),
    markets: array(string()),
  }),
  structType({
    type: enums(['error'] as const),
    code: string(),
    topic: optional(string()),
    message: string(),
    events: optional(array(string())),
    markets: optional(array(string())),
  }),
]);

export const parsePredictLiveDataServerFrame = (
  value: unknown,
): PredictLiveDataServerFrame | undefined => {
  try {
    return mask(
      value,
      serverFrame as Struct<PredictLiveDataServerFrame, unknown>,
    );
  } catch {
    return undefined;
  }
};
