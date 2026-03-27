import type { OndoCampaignTier } from '../../../../../core/Engine/controllers/rewards-controller/types';

/**
 * Parses portfolio summary `netDeposit` string (API returns decimal strings).
 */
export const parseOndoPortfolioNetDepositUsd = (
  value: string | undefined,
): number | null => {
  if (value === undefined || value === '') {
    return null;
  }
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Result of `getOndoTierProgressState`.
 */
export type OndoTierProgressState =
  | { kind: 'top' }
  | {
      kind: 'progress';
      progressRatio: number;
      /** USD still needed to reach the next tier’s `minNetDeposit` (0 only in edge cases, e.g. degenerate spans). */
      remainingUsd: number;
    };

/**
 * Computes tier progress toward the next tier using segment progress between
 * the current tier's `minNetDeposit` and the next tier's `minNetDeposit`.
 *
 * **Current tier** is the highest tier (by `minNetDeposit` order) whose threshold
 * is at most `netDeposit` — i.e. portfolio net deposit determines which rung
 * the user sits on.
 *
 * Expects non-empty `tiers`.
 */
export const getOndoTierProgressState = (
  tiers: OndoCampaignTier[],
  netDeposit: number,
): OndoTierProgressState => {
  if (tiers.length === 0) {
    throw new Error('getOndoTierProgressState: tiers must be non-empty');
  }

  const sorted = [...tiers].sort((a, b) => a.minNetDeposit - b.minNetDeposit);

  const deposit = Number.isFinite(netDeposit) ? Math.max(0, netDeposit) : 0;

  let currentIndex = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].minNetDeposit <= deposit) {
      currentIndex = i;
      break;
    }
  }

  // If no tier is found, user have not reached the first tier yet.
  if (currentIndex === -1) {
    return {
      kind: 'progress',
      progressRatio: 0,
      remainingUsd: sorted[0].minNetDeposit - deposit,
    };
  }

  if (currentIndex >= sorted.length - 1) {
    return { kind: 'top' };
  }

  const currentTier = sorted[currentIndex];
  const nextTier = sorted[currentIndex + 1];
  const currentMin = currentTier.minNetDeposit;
  const nextMin = nextTier.minNetDeposit;
  const span = nextMin - currentMin;

  let progressRatio: number;
  if (span <= 0) {
    progressRatio = deposit >= nextMin ? 1 : 0;
  } else {
    progressRatio = (deposit - currentMin) / span;
    progressRatio = Math.min(1, Math.max(0, progressRatio));
  }

  const remainingUsd = Math.max(0, nextMin - deposit);

  return {
    kind: 'progress',
    progressRatio,
    remainingUsd,
  };
};

/**
 * Formats segment progress ratio (0–1) as an integer percentage label.
 */
export const formatTierProgressPercent = (progressRatio: number): string =>
  `${Math.round(Math.min(1, Math.max(0, progressRatio)) * 100)}%`;
