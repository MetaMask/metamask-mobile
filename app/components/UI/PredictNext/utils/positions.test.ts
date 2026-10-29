import type { PredictPosition } from '../types';
import { dedupeLatestPositions, positionKey } from './positions';

const position = (overrides: Record<string, string>) =>
  ({
    venueId: 'kalshi',
    marketId: 'market-1',
    side: 'yes',
    status: 'open',
    shares: '1',
    ...overrides,
  }) as PredictPosition;

describe('dedupeLatestPositions', () => {
  it('keeps the later copy of a Position whose status advanced', () => {
    const open = position({ marketId: 'a', status: 'open' });
    const other = position({ marketId: 'b' });
    const settled = position({ marketId: 'a', status: 'settled' });

    const result = dedupeLatestPositions([
      { positions: [open, other] },
      { positions: [settled] },
    ]);

    expect(result).toEqual([other, settled]);
  });

  it('keeps both sides of one Market', () => {
    const yes = position({ side: 'yes' });
    const no = position({ side: 'no' });

    expect(dedupeLatestPositions([{ positions: [yes, no] }])).toEqual([
      yes,
      no,
    ]);
  });

  it('keys a Position by Market and side', () => {
    expect(positionKey(position({ marketId: 'm', side: 'no' }))).toBe('m-no');
  });
});
