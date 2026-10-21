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
