import type { PredictOutcome } from '../../types';
import type { GameEvent, GameFlashMarketEvent, GamePlayEvent } from './types';

export type GameLiveMarketKind = 'moneyline' | 'spread' | 'total';

/** Real game markets available for inline interleaving, keyed by kind. */
export interface GameLiveMarkets {
  moneyline?: PredictOutcome[];
  spread?: PredictOutcome[];
  total?: PredictOutcome[];
}

export type GameLiveFeedItem =
  | { id: string; kind: 'play'; event: GamePlayEvent }
  | { id: string; kind: 'flash'; event: GameFlashMarketEvent }
  | {
      id: string;
      kind: 'market';
      marketKind: GameLiveMarketKind;
      outcomes: PredictOutcome[];
    };

const MARKET_KIND_CYCLE: GameLiveMarketKind[] = [
  'moneyline',
  'spread',
  'total',
];

export const DEFAULT_INTERLEAVE_EVERY = 6;

export interface AppendEventOptions {
  /** Insert an inline market widget after this many play events. */
  interleaveEvery?: number;
}

/**
 * Pure reducer for the live game feed. Prepends the new event (feed renders
 * newest-first) and, after every Nth play event, weaves in a real inline
 * market widget, cycling moneyline → spread → total across the kinds that
 * actually exist on the market.
 */
export function appendEvent(
  items: GameLiveFeedItem[],
  event: GameEvent,
  markets: GameLiveMarkets,
  options: AppendEventOptions = {},
): GameLiveFeedItem[] {
  const interleaveEvery = options.interleaveEvery ?? DEFAULT_INTERLEAVE_EVERY;

  const head: GameLiveFeedItem =
    event.kind === 'play'
      ? { id: event.id, kind: 'play', event }
      : { id: event.id, kind: 'flash', event };
  const next = [head, ...items];

  if (event.kind !== 'play') {
    return next;
  }

  let playsSinceMarket = 0;
  for (const item of next) {
    if (item.kind === 'market') break;
    if (item.kind === 'play') playsSinceMarket += 1;
  }
  if (playsSinceMarket < interleaveEvery) {
    return next;
  }

  const availableKinds = MARKET_KIND_CYCLE.filter(
    (kind) => (markets[kind]?.length ?? 0) > 0,
  );
  if (availableKinds.length === 0) {
    return next;
  }

  const marketItemCount = next.filter((item) => item.kind === 'market').length;
  const marketKind = availableKinds[marketItemCount % availableKinds.length];
  const outcomes = markets[marketKind] as PredictOutcome[];

  return [
    {
      id: `market-${marketKind}-${event.id}`,
      kind: 'market',
      marketKind,
      outcomes,
    },
    ...next,
  ];
}
