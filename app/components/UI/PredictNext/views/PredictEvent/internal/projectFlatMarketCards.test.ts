import { PREDICT_MARKET_TYPES } from '../../../constants';
import type {
  PredictEntityId,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import { projectFlatMarketCards } from './projectFlatMarketCards';

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
  marketType: (typeof PREDICT_MARKET_TYPES)[keyof typeof PREDICT_MARKET_TYPES],
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

const standardCard = (market: PredictMarket) => ({
  type: 'standard' as const,
  key: `market:${market.id}`,
  market,
});

const lineCard = (
  key: string,
  marketType: (typeof PREDICT_MARKET_TYPES)[keyof typeof PREDICT_MARKET_TYPES],
  markets: PredictMarket[],
) => ({
  type: 'marketSelector' as const,
  key,
  marketType,
  markets,
  name: 'self' as const,
});

describe('projectFlatMarketCards', () => {
  it('groups related Markets, orders options, and keeps the group position', () => {
    const markets = [
      createMarket('standard'),
      createMarket(
        'total-high',
        createGroup(PREDICT_MARKET_TYPES.TOTAL, 'totals', 220.5, 1),
      ),
      createMarket(
        'total-low',
        createGroup(PREDICT_MARKET_TYPES.TOTAL, 'totals', 218.5, 0),
      ),
      createMarket('after-standard'),
    ];

    expect(projectFlatMarketCards(markets)).toEqual([
      standardCard(markets[0]),
      lineCard('totals', PREDICT_MARKET_TYPES.TOTAL, [markets[2], markets[1]]),
      standardCard(markets[3]),
    ]);
  });

  it('keeps moneyline Markets beside total and spread groups', () => {
    const markets = [
      createMarket('moneyline'),
      createMarket(
        'spread-high',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'spreads', 2.5, 1),
      ),
      createMarket(
        'total-high',
        createGroup(PREDICT_MARKET_TYPES.TOTAL, 'totals', 220.5, 1),
      ),
      createMarket(
        'spread-low',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'spreads', 1.5, 0),
      ),
      createMarket(
        'total-low',
        createGroup(PREDICT_MARKET_TYPES.TOTAL, 'totals', 218.5, 0),
      ),
    ];

    expect(projectFlatMarketCards(markets)).toEqual([
      standardCard(markets[0]),
      lineCard('spreads', PREDICT_MARKET_TYPES.SPREAD, [
        markets[3],
        markets[1],
      ]),
      lineCard('totals', PREDICT_MARKET_TYPES.TOTAL, [markets[4], markets[2]]),
    ]);
  });

  it('keeps distinct spread group keys in separate selectors', () => {
    const markets = [
      createMarket(
        'spread-home-high',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'home-spreads', 2.5, 0),
        'home',
      ),
      createMarket(
        'spread-away-high',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'away-spreads', 2.5, 1),
        'away',
      ),
      createMarket(
        'spread-home-low',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'home-spreads', 1.5, 2),
        'home',
      ),
      createMarket(
        'spread-away-low',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'away-spreads', 1.5, 3),
        'away',
      ),
    ];

    expect(projectFlatMarketCards(markets)).toEqual([
      lineCard('home-spreads', PREDICT_MARKET_TYPES.SPREAD, [
        markets[0],
        markets[2],
      ]),
      lineCard('away-spreads', PREDICT_MARKET_TYPES.SPREAD, [
        markets[1],
        markets[3],
      ]),
    ]);
  });

  it('orders spread Markets by backend display order', () => {
    const markets = [
      createMarket(
        'spread-home-high',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'spreads', 2.5, 0),
        'home',
      ),
      createMarket(
        'spread-away-high',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'spreads', -2.5, 3),
        'away',
      ),
      createMarket(
        'spread-home-low',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'spreads', 1.5, 1),
        'home',
      ),
      createMarket(
        'spread-away-low',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'spreads', -1.5, 2),
        'away',
      ),
    ];

    expect(projectFlatMarketCards(markets)).toEqual([
      lineCard('spreads', PREDICT_MARKET_TYPES.SPREAD, [
        markets[0],
        markets[2],
        markets[3],
        markets[1],
      ]),
    ]);
  });

  it('keeps response order when spread display order is absent', () => {
    const markets = [
      createMarket(
        'spread-away',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'spreads', -1.5),
        'away',
      ),
      createMarket(
        'spread-home',
        createGroup(PREDICT_MARKET_TYPES.SPREAD, 'spreads', 1.5),
        'home',
      ),
    ];

    expect(projectFlatMarketCards(markets)).toEqual([
      lineCard('spreads', PREDICT_MARKET_TYPES.SPREAD, markets),
    ]);
  });

  it('keeps unsupported groups in the standard Market presentation', () => {
    const market = createMarket('future', {
      key: 'future',
      groupType: 'futureGroup',
    });

    expect(projectFlatMarketCards([market])).toEqual([standardCard(market)]);
  });

  it('falls back to standard cards for duplicate total options', () => {
    const duplicate = createMarket(
      'duplicate',
      createGroup(PREDICT_MARKET_TYPES.TOTAL, 'bad', 1, 0),
    );
    const duplicateAgain = createMarket(
      'duplicate-again',
      createGroup(PREDICT_MARKET_TYPES.TOTAL, 'bad', 1, 1),
    );

    expect(projectFlatMarketCards([duplicate, duplicateAgain])).toEqual([
      standardCard(duplicate),
      standardCard(duplicateAgain),
    ]);
  });
});
