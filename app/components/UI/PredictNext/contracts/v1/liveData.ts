import {
  array,
  enums,
  mask,
  number,
  optional,
  record,
  string,
  type Struct,
  type as structType,
  unknown,
  union,
} from '@metamask/superstruct';
import type { PredictEntityId, PredictVenueId } from '../../types';

export interface PredictGameLive {
  venueId: PredictVenueId;
  eventId: PredictEntityId;
  type: string;
  /** Opaque venue-native payload (Kalshi today). Not the canonical PredictGame. */
  details: Record<string, unknown>;
}

export interface PredictLiveDataTopicLimits {
  maxPerConnection: number;
  maxPerMessage: number;
}

export type PredictLiveDataServerFrame =
  | {
      type: 'welcome';
      protocol: number;
      limits?: {
        game?: PredictLiveDataTopicLimits;
        market?: PredictLiveDataTopicLimits;
      };
    }
  | {
      type: 'game_snapshot' | 'game';
      game: PredictGameLive;
    }
  | {
      type: 'subscribed' | 'unsubscribed';
      topic: 'game';
      venueId: PredictVenueId;
      events: string[];
    }
  | {
      type: 'error';
      code: string;
      message: string;
    };

// The server sends more fields than mobile reads (`welcome` carries heartbeat
// and limits, for example). `mask` does not strip unknown keys inside a union,
// so these must tolerate extra properties rather than reject the frame.
const gameLive = structType({
  venueId: string(),
  eventId: string(),
  type: string(),
  details: record(string(), unknown()),
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
      }),
    ),
  }),
  structType({
    type: enums(['game_snapshot', 'game'] as const),
    game: gameLive,
  }),
  structType({
    type: enums(['subscribed', 'unsubscribed'] as const),
    topic: enums(['game'] as const),
    venueId: string(),
    events: array(string()),
  }),
  structType({
    type: enums(['error'] as const),
    code: string(),
    message: string(),
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
