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

  it('returns the short insider label for the subline presentation', () => {
    const result = getPositionFlagLabelKey(
      { ...basePosition, flags: ['insider'] },
      'subline',
    );

    expect(result).toBe(POSITION_FLAG_SHORT_LABEL_KEYS.insider);
  });

  it('returns the short creator label for a developer flag', () => {
    const result = getPositionFlagLabelKey(
      { ...basePosition, flags: ['developer'] },
      'subline',
    );

    expect(result).toBe(POSITION_FLAG_SHORT_LABEL_KEYS.developer);
  });

  it('returns the short excluded label for an unrecognized flag', () => {
    const result = getPositionFlagLabelKey(
      { ...basePosition, flags: ['blocked'] },
      'subline',
    );

    expect(result).toBe(POSITION_FLAG_SHORT_LABEL_KEYS.excluded);
  });

  it('prefers the short insider label when both known flags are present', () => {
    const result = getPositionFlagLabelKey(
      { ...basePosition, flags: ['developer', 'insider'] },
      'subline',
    );

    expect(result).toBe(POSITION_FLAG_SHORT_LABEL_KEYS.insider);
  });
});

describe('getPositionFlagAccessibilityReasonKey', () => {
  it('returns null when the position has no flags', () => {
    const result = getPositionFlagAccessibilityReasonKey(basePosition);

    expect(result).toBeNull();
  });

  it('returns the insider reason for an insider flag', () => {
    const result = getPositionFlagAccessibilityReasonKey({
      ...basePosition,
      flags: ['insider'],
    });

    expect(result).toBe(
      'social_leaderboard.position_flags.accessibility.reason_insider',
    );
  });

  it('returns the creator reason for a developer flag', () => {
    const result = getPositionFlagAccessibilityReasonKey({
      ...basePosition,
      flags: ['developer'],
    });

    expect(result).toBe(
      'social_leaderboard.position_flags.accessibility.reason_creator',
    );
  });
});

describe('formatFlaggedPositionAccessibilityLabel', () => {
  it('includes the direction, percent, and reason', () => {
    const result = formatFlaggedPositionAccessibilityLabel({
      symbol: 'Nigel',
      value: '$693.24',
      direction: 'up',
      percent: '47.28%',
      reasonKey:
        'social_leaderboard.position_flags.accessibility.reason_insider',
    });

    expect(result).toBe(
      'Nigel, $693.24, up 47.28%, not counted in P&L, insider',
    );
  });

  it('drops the change clause when percent is missing', () => {
    const result = formatFlaggedPositionAccessibilityLabel({
      symbol: 'Nigel',
      value: '$693.24',
      direction: null,
      percent: null,
      reasonKey:
        'social_leaderboard.position_flags.accessibility.reason_creator',
    });

    expect(result).toBe('Nigel, $693.24, not counted in P&L, creator');
  });
});
