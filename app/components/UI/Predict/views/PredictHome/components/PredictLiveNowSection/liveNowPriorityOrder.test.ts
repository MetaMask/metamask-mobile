import type { PredictMarket } from '../../../../types';
import { applySeriesPriorityOrder } from './liveNowPriorityOrder';

const createMarket = (id: string, seriesId?: string): PredictMarket =>
  ({
    id,
    ...(seriesId ? { series: { id: seriesId, slug: id, title: id } } : {}),
  }) as unknown as PredictMarket;

const idsOf = (markets: PredictMarket[]) => markets.map((market) => market.id);

describe('applySeriesPriorityOrder', () => {
  it('returns the original order when priorityOrder is empty', () => {
    const markets = [createMarket('L1', 's1'), createMarket('C1', 's2')];

    const result = applySeriesPriorityOrder(markets, []);

    expect(result).toBe(markets);
  });

  it('returns the original order when no markets match', () => {
    const markets = [createMarket('L1', 's1'), createMarket('L2')];

    const result = applySeriesPriorityOrder(markets, ['missing']);

    expect(result).toBe(markets);
  });

  it('pins matching series to the front in priorityOrder', () => {
    const markets = [
      createMarket('L1', 'sports'),
      createMarket('C1', '10684'),
      createMarket('L2', 'sports'),
      createMarket('C2', '10683'),
    ];

    const result = applySeriesPriorityOrder(markets, ['10684', '10683']);

    expect(idsOf(result)).toEqual(['C1', 'C2', 'L1', 'L2']);
  });

  it('keeps relative order for multiple markets in the same series', () => {
    const markets = [
      createMarket('L1', 'nba'),
      createMarket('C1', '10684'),
      createMarket('L2', 'nba'),
    ];

    const result = applySeriesPriorityOrder(markets, ['nba']);

    expect(idsOf(result)).toEqual(['L1', 'L2', 'C1']);
  });

  it('ignores unknown series IDs and duplicate priority entries', () => {
    const markets = [
      createMarket('L1'),
      createMarket('C1', '10684'),
      createMarket('C2', '10683'),
    ];

    const result = applySeriesPriorityOrder(markets, [
      'missing',
      '10683',
      '10683',
      '10684',
    ]);

    expect(idsOf(result)).toEqual(['C2', 'C1', 'L1']);
  });
});
