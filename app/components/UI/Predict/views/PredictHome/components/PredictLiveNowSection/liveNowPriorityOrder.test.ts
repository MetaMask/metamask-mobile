import type { PredictMarket } from '../../../../types';
import {
  applySeriesPriority,
  applySeriesPriorityOrder,
} from './liveNowPriorityOrder';

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

describe('applySeriesPriority', () => {
  it('delegates to priorityOrder when prioritySlots is empty', () => {
    const markets = [createMarket('L1', 'sports'), createMarket('C1', '10684')];

    const result = applySeriesPriority(markets, ['10684'], []);

    expect(idsOf(result)).toEqual(['C1', 'L1']);
  });

  it('places a matching series at the requested index', () => {
    const markets = [
      createMarket('L1', 'sports'),
      createMarket('L2', 'sports'),
      createMarket('C1', '10684'),
      createMarket('L3', 'sports'),
    ];

    const result = applySeriesPriority(
      markets,
      [],
      [{ seriesId: '10684', index: 1 }],
    );

    expect(idsOf(result)).toEqual(['L1', 'C1', 'L2', 'L3']);
  });

  it('places multiple series at their requested indexes', () => {
    const markets = [
      createMarket('L1', 'sports'),
      createMarket('C1', '10684'),
      createMarket('L2', 'sports'),
      createMarket('C2', '10683'),
      createMarket('L3', 'sports'),
    ];

    const result = applySeriesPriority(
      markets,
      [],
      [
        { seriesId: '10684', index: 1 },
        { seriesId: '10683', index: 3 },
      ],
    );

    expect(idsOf(result)).toEqual(['L1', 'C1', 'L2', 'C2', 'L3']);
  });

  it('clamps an out-of-range index to the end of the rail', () => {
    const markets = [createMarket('L1', 'sports'), createMarket('C1', '10684')];

    const result = applySeriesPriority(
      markets,
      [],
      [{ seriesId: '10684', index: 9 }],
    );

    expect(idsOf(result)).toEqual(['L1', 'C1']);
  });

  it('ignores unknown series IDs without creating a hole', () => {
    const markets = [createMarket('L1', 'sports'), createMarket('C1', '10684')];

    const result = applySeriesPriority(
      markets,
      [],
      [
        { seriesId: 'missing', index: 0 },
        { seriesId: '10684', index: 1 },
      ],
    );

    expect(idsOf(result)).toEqual(['L1', 'C1']);
  });

  it('keeps the first slot for a duplicate series or index', () => {
    const markets = [
      createMarket('L1', 'sports'),
      createMarket('C1', '10684'),
      createMarket('C2', '10683'),
    ];

    const result = applySeriesPriority(
      markets,
      [],
      [
        { seriesId: '10684', index: 1 },
        { seriesId: '10684', index: 0 },
        { seriesId: '10683', index: 1 },
      ],
    );

    expect(idsOf(result)).toEqual(['L1', 'C1', 'C2']);
  });

  it('lets slots win over priorityOrder for the same series', () => {
    const markets = [
      createMarket('L1', 'sports'),
      createMarket('C1', '10684'),
      createMarket('L2', 'sports'),
    ];

    const result = applySeriesPriority(
      markets,
      ['10684'],
      [{ seriesId: '10684', index: 1 }],
    );

    expect(idsOf(result)).toEqual(['L1', 'C1', 'L2']);
  });

  it('still pins remaining series with priorityOrder after slots', () => {
    const markets = [
      createMarket('L1', 'sports'),
      createMarket('C1', '10684'),
      createMarket('L2', 'sports'),
      createMarket('C2', '10683'),
    ];

    const result = applySeriesPriority(
      markets,
      ['10683'],
      [{ seriesId: '10684', index: 1 }],
    );

    expect(idsOf(result)).toEqual(['C2', 'C1', 'L1', 'L2']);
  });
});
