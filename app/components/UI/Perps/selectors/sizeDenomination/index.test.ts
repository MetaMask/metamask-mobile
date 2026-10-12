import type { RootState } from '../../../../../reducers';
import { selectPerpsSizeDenomination } from './index';

const createMockState = (perpsSizeDenomination?: unknown): RootState =>
  ({
    settings: {
      perpsSizeDenomination,
    },
  }) as unknown as RootState;

describe('selectPerpsSizeDenomination', () => {
  it('returns the persisted coin denomination', () => {
    const result = selectPerpsSizeDenomination(createMockState('asset'));

    expect(result).toBe('asset');
  });

  it('falls back to USD when the setting is missing', () => {
    const result = selectPerpsSizeDenomination({
      settings: {},
    } as unknown as RootState);

    expect(result).toBe('usd');
  });

  it('falls back to USD when the stored value is unknown', () => {
    const result = selectPerpsSizeDenomination(createMockState('coin'));

    expect(result).toBe('usd');
  });
});
