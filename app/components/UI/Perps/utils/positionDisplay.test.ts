import { TagSeverity, TextColor } from '@metamask/design-system-react-native';
import type { Position } from '@metamask/perps-controller';
import { getPerpsPositionHeaderDisplay } from './positionDisplay';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    if (key === 'perps.market.long') {
      return 'Long';
    }
    if (key === 'perps.market.short') {
      return 'Short';
    }
    return key;
  },
}));

const createPosition = (overrides: Partial<Position> = {}): Position => ({
  symbol: 'ETH',
  size: '1.5',
  entryPrice: '2900',
  positionValue: '4350',
  unrealizedPnl: '150',
  marginUsed: '1450',
  leverage: { type: 'isolated', value: 3 },
  liquidationPrice: '2500',
  maxLeverage: 50,
  returnOnEquity: '0.103',
  cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

describe('getPerpsPositionHeaderDisplay', () => {
  it('formats a long position header', () => {
    const position = createPosition();

    const result = getPerpsPositionHeaderDisplay(position);

    expect(result).toEqual({
      displaySymbol: 'ETH',
      absoluteSize: 1.5,
      directionLabel: '3x Long',
      directionSeverity: TagSeverity.Success,
      description: '1.5 ETH • $4,350',
      pnlText: '+$150.00',
      roeText: '+10.3%',
      pnlColor: TextColor.SuccessDefault,
    });
  });

  it('formats a short position header', () => {
    const position = createPosition({
      size: '-1.5',
      unrealizedPnl: '-50.25',
      returnOnEquity: '-0.025',
    });

    const result = getPerpsPositionHeaderDisplay(position);

    expect(result.directionLabel).toBe('3x Short');
    expect(result.directionSeverity).toBe(TagSeverity.Danger);
    expect(result.description).toBe('1.5 ETH • $4,350');
    expect(result.pnlText).toBe('-$50.25');
    expect(result.roeText).toBe('-2.5%');
    expect(result.pnlColor).toBe(TextColor.ErrorDefault);
  });

  it('classifies a zero-size position as short', () => {
    const position = createPosition({ size: '0' });

    const result = getPerpsPositionHeaderDisplay(position);

    expect(result.directionLabel).toBe('3x Short');
    expect(result.directionSeverity).toBe(TagSeverity.Danger);
  });

  it('formats a nonnumeric return on equity as zero percent', () => {
    const position = createPosition({ returnOnEquity: 'not-a-number' });

    const result = getPerpsPositionHeaderDisplay(position);

    expect(result.roeText).toBe('+0.0%');
  });
});
