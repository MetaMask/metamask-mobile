import type {
  PredictEntityId,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import { createMarketGroupProjection } from './createMarketGroupProjection';

const createMarket = (
  id: string,
  group?: PredictMarket['group'],
  yesGameSelection?: PredictOutcome['gameSelection'],
): PredictMarket => ({
  id: id as PredictEntityId,
  question: id,
  status: 'active',
  group,
  outcomes: [
    {
      id: `${id}-yes` as PredictEntityId,
      side: 'yes',
      label: 'Yes',
      ...(yesGameSelection === undefined
        ? {}
        : { gameSelection: yesGameSelection }),
    },
    { id: `${id}-no` as PredictEntityId, side: 'no', label: 'No' },
  ],
});

const createGroup = (
  marketType: 'spread' | 'total',
  key: string,
  option: number,
  displayOrder?: number,
): PredictMarket['group'] => ({
  key,
  groupType: 'marketSelector',
  marketType,
  option: { type: 'number', value: option },
  displayOrder,
});

describe('createMarketGroupProjection', () => {
  it('groups related Markets, orders options, and keeps the group position', () => {
    const markets = [
      createMarket('standard'),
      createMarket('total-high', createGroup('total', 'totals', 220.5, 1)),
      createMarket('total-low', createGroup('total', 'totals', 218.5, 0)),
      createMarket('after-standard'),
    ];

    const result = createMarketGroupProjection(markets);

    expect(result).toEqual([
      { type: 'standard', market: markets[0], firstIndex: 0 },
      {
        type: 'group',
        key: 'totals',
        marketType: 'total',
        markets: [markets[2], markets[1]],
        firstIndex: 1,
      },
      { type: 'standard', market: markets[3], firstIndex: 3 },
    ]);
  });

  it('keeps moneyline Markets beside total and spread groups', () => {
    const markets = [
      createMarket('moneyline'),
      createMarket('spread-high', createGroup('spread', 'spreads', 2.5, 1)),
      createMarket('total-high', createGroup('total', 'totals', 220.5, 1)),
      createMarket('spread-low', createGroup('spread', 'spreads', 1.5, 0)),
      createMarket('total-low', createGroup('total', 'totals', 218.5, 0)),
    ];

    expect(createMarketGroupProjection(markets)).toEqual([
      { type: 'standard', market: markets[0], firstIndex: 0 },
      {
        type: 'group',
        key: 'spreads',
        marketType: 'spread',
        markets: [markets[3], markets[1]],
        firstIndex: 1,
      },
      {
        type: 'group',
        key: 'totals',
        marketType: 'total',
        markets: [markets[4], markets[2]],
        firstIndex: 2,
      },
    ]);
  });

  it('keeps distinct spread group keys in separate selectors', () => {
    const markets = [
      createMarket(
        'spread-home-high',
        createGroup('spread', 'home-spreads', 2.5, 0),
        'home',
      ),
      createMarket(
        'spread-away-high',
        createGroup('spread', 'away-spreads', 2.5, 1),
        'away',
      ),
      createMarket(
        'spread-home-low',
        createGroup('spread', 'home-spreads', 1.5, 2),
        'home',
      ),
      createMarket(
        'spread-away-low',
        createGroup('spread', 'away-spreads', 1.5, 3),
        'away',
      ),
    ];

    expect(createMarketGroupProjection(markets)).toEqual([
      {
        type: 'group',
        key: 'home-spreads',
        marketType: 'spread',
        markets: [markets[0], markets[2]],
        firstIndex: 0,
      },
      {
        type: 'group',
        key: 'away-spreads',
        marketType: 'spread',
        markets: [markets[1], markets[3]],
        firstIndex: 1,
      },
    ]);
  });

  it('keeps unsupported groups in the standard Market presentation', () => {
    const market = createMarket('future', {
      key: 'future',
      groupType: 'futureGroup',
    });

    expect(createMarketGroupProjection([market])).toEqual([
      { type: 'standard', market, firstIndex: 0 },
    ]);
  });

  it('falls back to standard cards for duplicate total options', () => {
    const duplicate = createMarket(
      'duplicate',
      createGroup('total', 'bad', 1, 0),
    );
    const duplicateAgain = createMarket(
      'duplicate-again',
      createGroup('total', 'bad', 1, 1),
    );

    expect(createMarketGroupProjection([duplicate, duplicateAgain])).toEqual([
      { type: 'standard', market: duplicate, firstIndex: 0 },
      { type: 'standard', market: duplicateAgain, firstIndex: 1 },
    ]);
  });
});
