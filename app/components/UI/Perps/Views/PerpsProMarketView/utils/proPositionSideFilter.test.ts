import type { Position } from '@metamask/perps-controller';
import {
  DEFAULT_PRO_POSITION_SIDE_FILTER,
  filterProPositionsBySide,
} from './proPositionSideFilter';

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

describe('filterProPositionsBySide', () => {
  it('returns all positions when filter is all', () => {
    const positions = [
      makePosition({ symbol: 'BTC', size: '1' }),
      makePosition({ symbol: 'ETH', size: '-1' }),
    ];

    expect(
      filterProPositionsBySide(positions, DEFAULT_PRO_POSITION_SIDE_FILTER),
    ).toEqual(positions);
  });

  it('filters long positions only', () => {
    const positions = [
      makePosition({ symbol: 'BTC', size: '1' }),
      makePosition({ symbol: 'ETH', size: '-1' }),
      makePosition({ symbol: 'SOL', size: '0.5' }),
    ];

    expect(filterProPositionsBySide(positions, 'long')).toEqual([
      positions[0],
      positions[2],
    ]);
  });

  it('filters short positions only', () => {
    const positions = [
      makePosition({ symbol: 'BTC', size: '1' }),
      makePosition({ symbol: 'ETH', size: '-1' }),
    ];

    expect(filterProPositionsBySide(positions, 'short')).toEqual([
      positions[1],
    ]);
  });
});
