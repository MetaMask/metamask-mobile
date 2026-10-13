import { BigNumber } from 'bignumber.js';
import type {
  EarningClaimFamily,
  EarningsSummaryDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';

/**
 * Lifetime total of one claim family, in mUSD base units.
 *
 * The summary splits every accrual into two branches before grouping it:
 * `self_earned` is what the profile earned on its own trades, `earned_by_others`
 * is what other people's trades earned it. The same family name can appear on
 * both, and they are different money, so the branch is never inferred here.
 *
 * `null` means the branch carries no such family — which is not zero: the
 * server omits a family the caller has no claim on at all, and emits it at
 * `"0"` once the mechanism can pay them.
 */
function familyLifetime(
  branch:
    | EarningsSummaryDto['self_earned']
    | EarningsSummaryDto['earned_by_others']
    | undefined,
  family: EarningClaimFamily,
): string | null {
  return branch?.by_claim_family?.[family]?.lifetime ?? null;
}

/**
 * A positive void marks the whole reward voided. There is no partial void, so
 * the row shows the original amount rather than a remainder.
 */
export function isVoidedEarning(voided: string | null | undefined): boolean {
  if (voided == null || voided === '') {
    return false;
  }
  const amount = new BigNumber(voided);
  return amount.isFinite() && amount.gt(0);
}

/** Lifetime the profile earned on its own trades, e.g. its cashback. */
export function selfEarnedLifetime(
  summary: EarningsSummaryDto | null | undefined,
  family: EarningClaimFamily,
): string | null {
  return familyLifetime(summary?.self_earned, family);
}

/** Lifetime other people's trades earned the profile, e.g. its rev share. */
export function earnedByOthersLifetime(
  summary: EarningsSummaryDto | null | undefined,
  family: EarningClaimFamily,
): string | null {
  return familyLifetime(summary?.earned_by_others, family);
}

function summaryFamilies(summary: EarningsSummaryDto) {
  return [
    ...Object.values(summary.self_earned?.by_claim_family ?? {}),
    ...Object.values(summary.earned_by_others?.by_claim_family ?? {}),
  ];
}

function finiteBaseUnits(value: string | null | undefined): BigNumber {
  const amount = new BigNumber(value ?? 0);
  if (!amount.isFinite() || !amount.gt(0)) {
    return new BigNumber(0);
  }
  return amount;
}

function blockedUnderReview(family: {
  blocking_reason?: string | null;
  blocked?: string | null;
}): BigNumber {
  if (family.blocking_reason !== 'UNDER_REVIEW') {
    return new BigNumber(0);
  }
  return finiteBaseUnits(family.blocked);
}

/**
 * Base units a review is holding in `blocked`, summed across both branches'
 * claim families.
 *
 * A branch reason is null when its families disagree, so the family is the
 * place a mixed branch still says `UNDER_REVIEW`. Zero and any other reason
 * add nothing, and a summary with no such family returns null.
 */
export function underReviewBlockedBaseUnits(
  summary: EarningsSummaryDto | null | undefined,
): string | null {
  if (!summary) {
    return null;
  }
  const total = summaryFamilies(summary).reduce(
    (sum, family) => sum.plus(blockedUnderReview(family)),
    new BigNumber(0),
  );
  if (!total.gt(0)) {
    return null;
  }
  return total.toFixed(0);
}
