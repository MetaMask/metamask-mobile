import type { Position as PerpsPosition } from '@metamask/perps-controller';
import { mapPerpsControllerPositionToSocialPosition } from './mapPerpsControllerPositionToSocialPosition';

jest.mock('@metamask/perps-controller', () => ({
  getPerpsDisplaySymbol: (symbol: string) => symbol.replace(/^xyz:/, ''),
}));

const createPerpsPosition = (
  overrides: Partial<PerpsPosition> = {},
): PerpsPosition => ({
  symbol: 'BTC',
  size: '0.00013',
  entryPrice: '76000',
  positionValue: '9.93',
  unrealizedPnl: '-0.42',
  marginUsed: '3.31',
  leverage: { type: 'isolated', value: 3 },
  liquidationPrice: '50000',
  maxLeverage: 50,
  returnOnEquity: '-0.121',
  cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

describe('mapPerpsControllerPositionToSocialPosition', () => {
  it('maps a long perp into a hyperliquid social position', () => {
    const mapped = mapPerpsControllerPositionToSocialPosition(
      createPerpsPosition(),
    );

    expect(mapped.tokenSymbol).toBe('BTC');
    expect(mapped.chain).toBe('hyperliquid');
    expect(mapped.perpPositionType).toBe('long');
    expect(mapped.perpLeverage).toBe(3);
    expect(mapped.positionId).toBe('perps-local-BTC');
  });

  it('maps negative size to a short perp', () => {
    const mapped = mapPerpsControllerPositionToSocialPosition(
      createPerpsPosition({ size: '-1.5' }),
    );

    expect(mapped.perpPositionType).toBe('short');
    expect(mapped.positionAmount).toBe(1.5);
  });
});
