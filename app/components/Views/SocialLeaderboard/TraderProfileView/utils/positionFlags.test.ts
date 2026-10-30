import type { Position } from '@metamask/social-controllers';
import {
  getPositionFlagLabelKey,
  isPositionFlagged,
  POSITION_FLAG_LABEL_KEYS,
} from './positionFlags';

const basePosition: Position = {
  positionId: 'p',
  tokenSymbol: 'TKN',
  tokenName: 'Token',
  tokenAddress: '0x1',
  chain: 'base',
  positionAmount: 100,
  boughtUsd: 100,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 100,
  trades: [],
  lastTradeAt: 0,
};

describe('isPositionFlagged', () => {
  it('returns false when flags are omitted', () => {
    const result = isPositionFlagged(basePosition);

    expect(result).toBe(false);
  });

  it('returns false when flags are null or empty', () => {
    expect(isPositionFlagged({ ...basePosition, flags: null })).toBe(false);
    expect(isPositionFlagged({ ...basePosition, flags: [] })).toBe(false);
    expect(isPositionFlagged(undefined)).toBe(false);
  });

  it('returns true for insider, developer, and unrecognized flags', () => {
    expect(isPositionFlagged({ ...basePosition, flags: ['insider'] })).toBe(
      true,
    );
    expect(isPositionFlagged({ ...basePosition, flags: ['developer'] })).toBe(
      true,
    );
    expect(isPositionFlagged({ ...basePosition, flags: ['blocked'] })).toBe(
      true,
    );
  });
});

describe('getPositionFlagLabelKey', () => {
  it('returns null when flags are omitted', () => {
    const result = getPositionFlagLabelKey(basePosition);

    expect(result).toBeNull();
  });

  it('returns null when flags are null', () => {
    const result = getPositionFlagLabelKey({ ...basePosition, flags: null });

    expect(result).toBeNull();
  });

  it('returns null when flags are empty', () => {
    const result = getPositionFlagLabelKey({ ...basePosition, flags: [] });

    expect(result).toBeNull();
  });

  it('returns the insider label key for an insider flag', () => {
    const result = getPositionFlagLabelKey({
      ...basePosition,
      flags: ['insider'],
    });

    expect(result).toBe(POSITION_FLAG_LABEL_KEYS.insider);
  });

  it('returns the developer label key for a developer flag', () => {
    const result = getPositionFlagLabelKey({
      ...basePosition,
      flags: ['developer'],
    });

    expect(result).toBe(POSITION_FLAG_LABEL_KEYS.developer);
  });

  it('prefers the insider label when both known flags are present', () => {
    const result = getPositionFlagLabelKey({
      ...basePosition,
      flags: ['developer', 'insider'],
    });

    expect(result).toBe(POSITION_FLAG_LABEL_KEYS.insider);
  });

  it('returns the generic excluded label key for unrecognized flags', () => {
    const result = getPositionFlagLabelKey({
      ...basePosition,
      flags: ['blocked'],
    });

    expect(result).toBe(POSITION_FLAG_LABEL_KEYS.excluded);
  });
});
