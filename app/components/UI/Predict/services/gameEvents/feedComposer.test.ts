import type { PredictOutcome } from '../../types';
import {
  appendEvent,
  type GameLiveFeedItem,
  type GameLiveMarkets,
} from './feedComposer';
import type { GameEvent, GamePlayEvent } from './types';

const buildPlayEvent = (id: string): GamePlayEvent => ({
  id,
  kind: 'play',
  playType: 'shot_missed',
  timestamp: 0,
  period: 'Q4',
  clock: '5:00',
  teamSide: 'home',
  teamAbbreviation: 'NYK',
  description: 'Missed jumper',
  scoreAfter: { home: 100, away: 98 },
});

const buildFlashEvent = (id: string): GameEvent => ({
  id,
  kind: 'flash',
  timestamp: 0,
  question: 'Pick a player to score',
  options: [],
  closesAt: 15_000,
});

const buildOutcome = (id: string): PredictOutcome =>
  ({ id }) as unknown as PredictOutcome;

const markets: GameLiveMarkets = {
  moneyline: [buildOutcome('ml-1')],
  spread: [buildOutcome('sp-1')],
  total: [buildOutcome('to-1')],
};

const appendPlays = (
  initial: GameLiveFeedItem[],
  count: number,
  availableMarkets: GameLiveMarkets = markets,
  startIndex = 0,
): GameLiveFeedItem[] => {
  let items = initial;
  for (let i = 0; i < count; i += 1) {
    items = appendEvent(
      items,
      buildPlayEvent(`play-${startIndex + i}`),
      availableMarkets,
    );
  }
  return items;
};

describe('appendEvent', () => {
  it('prepends events newest-first', () => {
    const first = appendEvent([], buildPlayEvent('play-1'), {});
    const second = appendEvent(first, buildPlayEvent('play-2'), {});

    expect(second.map((item) => item.id)).toEqual(['play-2', 'play-1']);
  });

  it('inserts a market item after every Nth play event', () => {
    const items = appendPlays([], 6);

    expect(items[0].kind).toBe('market');
    expect(items.filter((item) => item.kind === 'market')).toHaveLength(1);
    expect(items.filter((item) => item.kind === 'play')).toHaveLength(6);
  });

  it('does not count flash events toward the interleave threshold', () => {
    let items = appendPlays([], 5);
    items = appendEvent(items, buildFlashEvent('flash-1'), markets);

    expect(items.some((item) => item.kind === 'market')).toBe(false);
  });

  it('cycles market kinds across insertions', () => {
    const items = appendPlays([], 18);

    const marketKinds = items
      .filter((item) => item.kind === 'market')
      .map((item) => (item.kind === 'market' ? item.marketKind : null))
      .reverse();
    expect(marketKinds).toEqual(['moneyline', 'spread', 'total']);
  });

  it('skips market kinds with no outcomes', () => {
    const moneylineOnly: GameLiveMarkets = {
      moneyline: [buildOutcome('ml-1')],
      spread: [],
    };
    const items = appendPlays([], 12, moneylineOnly);

    const marketKinds = items
      .filter((item) => item.kind === 'market')
      .map((item) => (item.kind === 'market' ? item.marketKind : null));
    expect(marketKinds).toEqual(['moneyline', 'moneyline']);
  });

  it('inserts no market items when no markets are available', () => {
    const items = appendPlays([], 10, {});

    expect(items.every((item) => item.kind !== 'market')).toBe(true);
    expect(items).toHaveLength(10);
  });

  it('respects a custom interleave interval', () => {
    let items: GameLiveFeedItem[] = [];
    for (let i = 0; i < 3; i += 1) {
      items = appendEvent(items, buildPlayEvent(`play-${i}`), markets, {
        interleaveEvery: 3,
      });
    }

    expect(items[0].kind).toBe('market');
  });
});
