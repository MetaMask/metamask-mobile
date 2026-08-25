import type { PredictEntityId, PredictMarket } from '../../../types';
import { createMarketGroupProjection } from './createMarketGroupProjection';

const createMarket = (
  id: string,
  group?: PredictMarket['group'],
): PredictMarket => ({
  id: id as PredictEntityId,
  question: id,
  status: 'active',
  group,
  outcomes: [
    { id: `${id}-yes` as PredictEntityId, side: 'yes', label: 'Yes' },
    { id: `${id}-no` as PredictEntityId, side: 'no', label: 'No' },
  ],
});

const totalGroup = (
  key: string,
  option: number,
  displayOrder?: number,
): PredictMarket['group'] => ({
  key,
  groupType: 'marketSelector',
  marketType: 'total',
  option: { type: 'number', value: option },
  displayOrder,
});

describe('createMarketGroupProjection', () => {
  it('groups related Markets, orders options, and keeps the group position', () => {
    const markets = [
      createMarket('standard'),
      createMarket('total-high', totalGroup('totals', 220.5, 1)),
      createMarket('total-low', totalGroup('totals', 218.5, 0)),
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

  it('keeps unsupported groups in the standard Market presentation', () => {
    const market = createMarket('future', {
      key: 'future',
      groupType: 'futureGroup',
    });

    expect(createMarketGroupProjection([market])).toEqual([
      { type: 'standard', market, firstIndex: 0 },
    ]);
  });

  it('falls back to standard cards for duplicate or conflicting options', () => {
    const duplicate = createMarket('duplicate', totalGroup('bad', 1, 0));
    const conflicting = createMarket('conflicting', {
      key: 'bad',
      groupType: 'marketSelector',
      marketType: 'spread',
      option: { type: 'number', value: 1 },
      displayOrder: 1,
    });

    expect(createMarketGroupProjection([duplicate, conflicting])).toEqual([
      { type: 'standard', market: duplicate, firstIndex: 0 },
      { type: 'standard', market: conflicting, firstIndex: 1 },
    ]);
  });
});
