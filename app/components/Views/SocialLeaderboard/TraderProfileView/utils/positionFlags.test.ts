import type { Position } from '@metamask/social-controllers';
import {
  formatFlaggedPositionAccessibilityLabel,
  getPositionFlagAccessibilityReasonKey,
  getPositionFlagLabelKey,
  POSITION_FLAG_LABEL_KEYS,
  POSITION_FLAG_SHORT_LABEL_KEYS,
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

  it.each([
    ['insider', ['insider'], POSITION_FLAG_SHORT_LABEL_KEYS.insider],
    ['creator', ['developer'], POSITION_FLAG_SHORT_LABEL_KEYS.developer],
    ['excluded', ['blocked'], POSITION_FLAG_SHORT_LABEL_KEYS.excluded],
    [
      'insider when both known flags are present',
      ['developer', 'insider'],
      POSITION_FLAG_SHORT_LABEL_KEYS.insider,
    ],
  ] as const)(
    'returns the short %s label for the subline presentation',
    (_name, flags, expected) => {
      const result = getPositionFlagLabelKey(
        { ...basePosition, flags: [...flags] },
        'subline',
      );

      expect(result).toBe(expected);
    },
  );
});

describe('getPositionFlagAccessibilityReasonKey', () => {
  it.each([
    ['no flags', basePosition, null],
    [
      'an insider flag',
      { ...basePosition, flags: ['insider' as const] },
      'social_leaderboard.position_flags.accessibility.reason_insider',
    ],
    [
      'a developer flag',
      { ...basePosition, flags: ['developer' as const] },
      'social_leaderboard.position_flags.accessibility.reason_creator',
    ],
  ])('returns the reason for %s', (_name, position, expected) => {
    const result = getPositionFlagAccessibilityReasonKey(position);

    expect(result).toBe(expected);
  });
});

describe('formatFlaggedPositionAccessibilityLabel', () => {
  it.each([
    [
      'the direction, percent, and reason',
      'up' as const,
      '47.28%',
      'social_leaderboard.position_flags.accessibility.reason_insider',
      'Nigel, $693.24, up 47.28%, not counted in P&L, insider',
    ],
    [
      'no change clause when percent is missing',
      null,
      null,
      'social_leaderboard.position_flags.accessibility.reason_creator',
      'Nigel, $693.24, not counted in P&L, creator',
    ],
  ])('includes %s', (_name, direction, percent, reasonKey, expected) => {
    const result = formatFlaggedPositionAccessibilityLabel({
      symbol: 'Nigel',
      value: '$693.24',
      direction,
      percent,
      reasonKey,
    });

    expect(result).toBe(expected);
  });
});
