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
 * Base units still owed. `musd_amount` and `lifetime` keep voided money inside
 * them; `voided` is the part that will never be paid.
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

function familyVoided(
  branch:
    | EarningsSummaryDto['self_earned']
    | EarningsSummaryDto['earned_by_others']
    | undefined,
  family: EarningClaimFamily,
): string | null {
  return branch?.by_claim_family?.[family]?.voided ?? null;
}

/** Lifetime still owed on the profile's own trades, voided money removed. */
export function creditedSelfEarnedLifetime(
  summary: EarningsSummaryDto | null | undefined,
  family: EarningClaimFamily,
): string | null {
  return creditedBaseUnits(
    selfEarnedLifetime(summary, family),
    familyVoided(summary?.self_earned, family),
  );
}

/** Lifetime still owed from other people's trades, voided money removed. */
export function creditedEarnedByOthersLifetime(
  summary: EarningsSummaryDto | null | undefined,
  family: EarningClaimFamily,
): string | null {
  return creditedBaseUnits(
    earnedByOthersLifetime(summary, family),
    familyVoided(summary?.earned_by_others, family),
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
