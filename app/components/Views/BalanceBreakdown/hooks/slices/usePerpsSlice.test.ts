import type { Position } from '@metamask/perps-controller';
import { sumPositionsMtMUsd } from './usePerpsSlice';

describe('sumPositionsMtMUsd', () => {
  it('adds positionValue and unrealizedPnl for each position', () => {
    const positions = [
      { positionValue: '50000', unrealizedPnl: '50' },
      { positionValue: '1500', unrealizedPnl: '-25.5' },
    ] as unknown as Position[];

    expect(sumPositionsMtMUsd(positions)).toBe(51524.5);
  });

  it('treats missing fields as zero', () => {
    const positions = [{}] as unknown as Position[];
    expect(sumPositionsMtMUsd(positions)).toBe(0);
  });
});
