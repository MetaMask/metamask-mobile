import type { PredictEntityId, PredictMarket } from '../../../types';
import { formatMarketGroupOption } from './formatMarketGroupOption';

const createMarket = (
  marketType: 'spread' | 'total',
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
  it('formats spread rows with signs and selector lines without signs', () => {
    const market = createMarket('spread', -2.5);

    const yesValue = formatMarketGroupOption(market, 'yes');
    const noValue = formatMarketGroupOption(market, 'no');
    const selectorValue = formatMarketGroupOption(market);

    expect(yesValue).toBe('+2.5');
    expect(noValue).toBe('-2.5');
    expect(selectorValue).toBe('2.5');
  });

  it('formats a total value without a handicap sign', () => {
    const market = createMarket('total', 220.5);

    const result = formatMarketGroupOption(market);

    expect(result).toBe('220.5');
  });

  it('returns no value when the market has no numeric group option', () => {
    const market = {
      ...createMarket('total', 220.5),
      group: { key: 'group-1', groupType: 'future-group' },
    };

    const result = formatMarketGroupOption(market);

    expect(result).toBeUndefined();
  });
});
