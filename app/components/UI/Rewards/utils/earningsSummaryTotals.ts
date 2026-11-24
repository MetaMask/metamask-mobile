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
 * Base units still owed on a ledger row. `musd_amount` keeps voided money
 * inside it; `voided_musd_amount` is the part that will never be paid. Family
 * `lifetime` already leaves voided money out, so it is shown as-is.
 *
 * Missing `voided` subtracts nothing. A void larger than the amount floors at
 * zero, so a row cannot render a negative credit.
 */
export function creditedBaseUnits(
  amount: string | null | undefined,
  voided?: string | null,
): string | null {
  if (amount == null || amount === '') {
    return null;
  }

  const total = new BigNumber(amount);
  if (!total.isFinite()) {
    return null;
  }

  const removed = new BigNumber(voided ?? 0);
  const net = total.minus(removed.isFinite() ? removed : 0);
  return (net.isNegative() ? new BigNumber(0) : net).toFixed(0);
}

/**
 * A ledger row is voided when every base unit of `musd_amount` is voided.
 * A day row adds up several earnings, and a void of some of them leaves the
 * rest payable, so a smaller `voided_musd_amount` is not a voided row. Treat
 * an over-void the same as a full void because the credited amount floors at
 * zero.
 */
export function isVoidedEarning(
  amount: string | null | undefined,
  voided: string | null | undefined,
): boolean {
  if (amount == null || amount === '' || voided == null || voided === '') {
    return false;
  }
  const total = new BigNumber(amount);
  const removed = new BigNumber(voided);
  return (
    total.isFinite() &&
    removed.isFinite() &&
    removed.gt(0) &&
    removed.gte(total)
  );
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

/** One claim family on one branch, for a page that shows a single family. */
export interface SummaryFamilyScope {
  branch: 'self_earned' | 'earned_by_others';
  family: EarningClaimFamily;
}

/**
 * Every family on both branches, or only the scoped one. A scoped family the
 * summary does not list yields nothing, not the other families.
 */
function summaryFamilies(
  summary: EarningsSummaryDto,
  scope?: SummaryFamilyScope,
) {
  if (scope) {
    const family = summary[scope.branch]?.by_claim_family?.[scope.family];
    return family ? [family] : [];
  }
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
 * add nothing, and a summary with no such family returns null. A `scope`
 * reads one family only.
 */
export function underReviewBlockedBaseUnits(
  summary: EarningsSummaryDto | null | undefined,
  scope?: SummaryFamilyScope,
): string | null {
  if (!summary) {
    return null;
  }
  const total = summaryFamilies(summary, scope).reduce(
    (sum, family) => sum.plus(blockedUnderReview(family)),
    new BigNumber(0),
  );
  if (!total.gt(0)) {
    return null;
  }
  return total.toFixed(0);
}

function heldForTax(family: {
  blocking_reason?: string | null;
  held?: string | null;
}): BigNumber {
  if (family.blocking_reason !== 'TAX_DETERMINATION_REQUIRED') {
    return new BigNumber(0);
  }
  return finiteBaseUnits(family.held);
}

/**
 * Base units held until a tax determination clears the payee, summed across
 * both branches' claim families. Only a family whose reason is
 * `TAX_DETERMINATION_REQUIRED` counts: `held` also carries balances held by a
 * claims pause, which a determination does not release. Cashback is never
 * held for tax. A `scope` reads one family only. No such balance returns null.
 */
export function taxHeldBaseUnits(
  summary: EarningsSummaryDto | null | undefined,
  scope?: SummaryFamilyScope,
): string | null {
  if (!summary) {
    return null;
  }
  const total = summaryFamilies(summary, scope).reduce(
    (sum, family) => sum.plus(heldForTax(family)),
    new BigNumber(0),
  );
  if (!total.gt(0)) {
    return null;
  }
  return total.toFixed(0);
}
