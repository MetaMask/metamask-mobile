import type { Position } from '@metamask/perps-controller';
import { DEFAULT_PRO_POSITION_SORT, sortProPositions } from './proPositionSort';

const makePosition = (overrides: Partial<Position> = {}): Position => ({
  symbol: 'BTC',
  size: '1',
  entryPrice: '50000',
  positionValue: '51000',
  unrealizedPnl: '1000',
  marginUsed: '10000',
  leverage: { type: 'cross', value: 5 },
  liquidationPrice: '40000',
  maxLeverage: 50,
  returnOnEquity: '0.10',
  cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

describe('sortProPositions', () => {
  it('defaults to position value high to low', () => {
    const positions = [
      makePosition({ symbol: 'BTC', positionValue: '1000' }),
      makePosition({ symbol: 'ETH', positionValue: '5000' }),
      makePosition({ symbol: 'SOL', positionValue: '3000' }),
    ];

    const sorted = sortProPositions(positions, DEFAULT_PRO_POSITION_SORT);

    expect(sorted.map((position) => position.symbol)).toEqual([
      'ETH',
      'SOL',
      'BTC',
    ]);
  });

  it('sorts unrealized P&L low to high when configured', () => {
    const positions = [
      makePosition({ symbol: 'BTC', unrealizedPnl: '100' }),
      makePosition({ symbol: 'ETH', unrealizedPnl: '-50' }),
      makePosition({ symbol: 'SOL', unrealizedPnl: '25' }),
    ];

    const sorted = sortProPositions(positions, {
      field: 'unrealizedPnl',
      direction: 'asc',
    });

    expect(sorted.map((position) => position.symbol)).toEqual([
      'ETH',
      'SOL',
      'BTC',
    ]);
  });

  it('sorts by market funding rate high to low when configured', () => {
    const positions = [
      makePosition({ symbol: 'BTC' }),
      makePosition({ symbol: 'ETH' }),
      makePosition({ symbol: 'SOL' }),
    ];
    const fundingRatesBySymbol = {
      BTC: 0.015,
      ETH: -0.005,
      SOL: 0.0025,
    };

    const sorted = sortProPositions(
      positions,
      {
        field: 'fundingRate',
        direction: 'desc',
      },
      fundingRatesBySymbol,
    );

    expect(sorted.map((position) => position.symbol)).toEqual([
      'BTC',
      'SOL',
      'ETH',
    ]);
  });
});
