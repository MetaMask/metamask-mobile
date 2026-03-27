import type { OndoCampaignTier } from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  formatTierProgressPercent,
  getOndoTierProgressState,
  parseOndoPortfolioNetDepositUsd,
} from './OndoTierProgress.util';

describe('OndoTierProgress.util', () => {
  const threeTiers: OndoCampaignTier[] = [
    { name: 'STARTER', minNetDeposit: 0 },
    { name: 'MID', minNetDeposit: 5000 },
    { name: 'UPPER', minNetDeposit: 10000 },
  ];

  describe('parseOndoPortfolioNetDepositUsd', () => {
    it('parses valid decimal strings', () => {
      expect(parseOndoPortfolioNetDepositUsd('8500.5')).toBe(8500.5);
    });

    it('returns null for empty or undefined', () => {
      expect(parseOndoPortfolioNetDepositUsd(undefined)).toBeNull();
      expect(parseOndoPortfolioNetDepositUsd('')).toBeNull();
    });

    it('returns null for non-numeric strings', () => {
      expect(parseOndoPortfolioNetDepositUsd('abc')).toBeNull();
    });
  });

  describe('getOndoTierProgressState', () => {
    it('throws when tiers is empty', () => {
      expect(() => getOndoTierProgressState([], 100)).toThrow(
        'tiers must be non-empty',
      );
    });

    it('returns top when net deposit qualifies for the last tier', () => {
      expect(getOndoTierProgressState(threeTiers, 12000)).toEqual({
        kind: 'top',
      });
    });

    it('infers current tier from net deposit (mid tier toward upper)', () => {
      expect(getOndoTierProgressState(threeTiers, 7500)).toEqual({
        kind: 'progress',
        progressRatio: 0.5,
        remainingUsd: 2500,
      });
    });

    it('computes segment progress from starter toward mid', () => {
      expect(getOndoTierProgressState(threeTiers, 2500)).toEqual({
        kind: 'progress',
        progressRatio: 0.5,
        remainingUsd: 2500,
      });
    });

    it('at exactly mid tier min, current tier is MID and progress is toward UPPER', () => {
      expect(getOndoTierProgressState(threeTiers, 5000)).toEqual({
        kind: 'progress',
        progressRatio: 0,
        remainingUsd: 5000,
      });
    });

    it('handles degenerate span (duplicate minNetDeposit): top when deposit meets threshold', () => {
      const degenerate: OndoCampaignTier[] = [
        { name: 'A', minNetDeposit: 1000 },
        { name: 'B', minNetDeposit: 1000 },
      ];
      expect(getOndoTierProgressState(degenerate, 1000)).toEqual({
        kind: 'top',
      });
    });

    it('handles degenerate span: progress from first tier when below duplicate mins', () => {
      const degenerate: OndoCampaignTier[] = [
        { name: 'A', minNetDeposit: 1000 },
        { name: 'B', minNetDeposit: 1000 },
      ];
      expect(getOndoTierProgressState(degenerate, 500)).toEqual({
        kind: 'progress',
        progressRatio: 0,
        remainingUsd: 500,
      });
    });

    it('progresses within MID→UPPER segment when deposit is between mids', () => {
      expect(getOndoTierProgressState(threeTiers, 6000)).toEqual({
        kind: 'progress',
        progressRatio: 0.2,
        remainingUsd: 4000,
      });
    });

    it('when no tier qualifies (deposit below first minimum), returns progress toward first tier', () => {
      const twoTiers: OndoCampaignTier[] = [
        { name: 'LOW', minNetDeposit: 1000 },
        { name: 'HIGH', minNetDeposit: 5000 },
      ];
      expect(getOndoTierProgressState(twoTiers, 100)).toEqual({
        kind: 'progress',
        progressRatio: 0,
        remainingUsd: 900,
      });
    });

    it('when no tier qualifies, remaining equals gap to first tier min (zero deposit)', () => {
      const tiers: OndoCampaignTier[] = [
        { name: 'LOW', minNetDeposit: 500 },
        { name: 'HIGH', minNetDeposit: 2000 },
      ];
      expect(getOndoTierProgressState(tiers, 0)).toEqual({
        kind: 'progress',
        progressRatio: 0,
        remainingUsd: 500,
      });
    });
  });

  describe('formatTierProgressPercent', () => {
    it('formats ratio as integer percent', () => {
      expect(formatTierProgressPercent(0.5)).toBe('50%');
    });

    it('clamps to 0–100%', () => {
      expect(formatTierProgressPercent(-0.1)).toBe('0%');
      expect(formatTierProgressPercent(1.2)).toBe('100%');
    });
  });
});
