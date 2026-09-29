import type { PredictMarket } from '../../../../types';
import {
  interleaveLiveNowMarkets,
  LIVE_NOW_MAX_CRYPTO,
} from './liveNowInterleave';

const createMarket = (id: string): PredictMarket =>
  ({ id }) as unknown as PredictMarket;

const createMarkets = (prefix: string, count: number): PredictMarket[] =>
  Array.from({ length: count }, (_, index) =>
    createMarket(`${prefix}${index + 1}`),
  );

const idsOf = (markets: PredictMarket[]) => markets.map((market) => market.id);

describe('interleaveLiveNowMarkets', () => {
  it('places a crypto card after every two live cards for 7 live and 3 crypto', () => {
    const live = createMarkets('L', 7);
    const crypto = createMarkets('C', 3);

    const result = interleaveLiveNowMarkets(live, crypto);

    expect(idsOf(result)).toEqual([
      'L1',
      'L2',
      'C1',
      'L3',
      'L4',
      'C2',
      'L5',
      'L6',
      'C3',
      'L7',
    ]);
  });

  it('fills remaining slots with live cards when only one crypto is available', () => {
    const live = createMarkets('L', 7);
    const crypto = createMarkets('C', 1);

    const result = interleaveLiveNowMarkets(live, crypto);

    expect(idsOf(result)).toEqual([
      'L1',
      'L2',
      'C1',
      'L3',
      'L4',
      'L5',
      'L6',
      'L7',
    ]);
  });

  it('caps crypto cards at the maximum', () => {
    const crypto = createMarkets('C', LIVE_NOW_MAX_CRYPTO + 2);

    const result = interleaveLiveNowMarkets([], crypto);

    expect(idsOf(result)).toEqual(['C1', 'C2', 'C3']);
    expect(result).toHaveLength(LIVE_NOW_MAX_CRYPTO);
  });

  it('shows crypto cards only when there are no live markets', () => {
    const crypto = createMarkets('C', 2);

    const result = interleaveLiveNowMarkets([], crypto);

    expect(idsOf(result)).toEqual(['C1', 'C2']);
  });

  it('returns live cards only when there are no crypto markets', () => {
    const live = createMarkets('L', 3);

    const result = interleaveLiveNowMarkets(live, []);

    expect(idsOf(result)).toEqual(['L1', 'L2', 'L3']);
  });

  it('returns an empty array when both inputs are empty', () => {
    const result = interleaveLiveNowMarkets([], []);

    expect(result).toEqual([]);
  });
});
