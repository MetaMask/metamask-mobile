import { PREDICT_MARKET_TYPES } from '../../../constants';
import type { PredictEntityId, PredictMarket } from '../../../types';
import { formatMarketGroupOption } from './formatMarketGroupOption';

const createMarket = (
  marketType: (typeof PREDICT_MARKET_TYPES)[keyof typeof PREDICT_MARKET_TYPES],
  value: number,
): PredictMarket => ({
  id: 'market-1' as PredictEntityId,
  question: 'Market question',
  status: 'active',
  group: {
    key: 'group-1',
    groupType: 'marketSelector',
    marketType,
    option: { type: 'number', value },
  },
  outcomes: [
    { id: 'market-1:yes' as PredictEntityId, side: 'yes', label: 'Yes' },
    { id: 'market-1:no' as PredictEntityId, side: 'no', label: 'No' },
  ],
});

describe('formatMarketGroupOption', () => {
  it('preserves signed spread rows and removes signs from selector lines', () => {
    const market = createMarket(PREDICT_MARKET_TYPES.SPREAD, -2.5);

    const yesValue = formatMarketGroupOption(market, 'yes');
    const noValue = formatMarketGroupOption(market, 'no');
    const selectorValue = formatMarketGroupOption(market);

    expect(yesValue).toBe('-2.5');
    expect(noValue).toBe('+2.5');
    expect(selectorValue).toBe('2.5');
  });

  it('formats a total value without a handicap sign', () => {
    const market = createMarket(PREDICT_MARKET_TYPES.TOTAL, 220.5);

    const result = formatMarketGroupOption(market);

    expect(result).toBe('220.5');
  });

  it('returns no value when the market has no numeric group option', () => {
    const market = {
      ...createMarket(PREDICT_MARKET_TYPES.TOTAL, 220.5),
      group: { key: 'group-1', groupType: 'future-group' },
    };

    const result = formatMarketGroupOption(market);

    expect(result).toBeUndefined();
  });
});
