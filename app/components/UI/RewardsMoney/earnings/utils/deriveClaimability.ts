import type {
  ClaimBlockingReason,
  EarningOriginType,
  EarningsSummaryDto,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';

/**
 * How much of the requested scope a claim would actually pay.
 *
 * - `all` — every requested type pays
 * - `partial` — some types pay, others are held
 * - `none` — nothing pays
 */
export type ClaimCoverage = 'all' | 'partial' | 'none';

export interface Claimability {
  /** Total net the claim would pay, in mUSD base units. */
  claimable: bigint;
  /** The types to send on the claim — exactly those whose `claimable > 0`. */
  claimableTypes: EarningOriginType[];
  /** Requested types that pay nothing right now. */
  withheldTypes: EarningOriginType[];
  coverage: ClaimCoverage;
  /** True when something is owed but the total sits under the minimum. */
  isBelowMinimum: boolean;
  /** True when a claim can be initiated right now. */
  canClaim: boolean;
  /**
   * Why the claim is blocked, when it is. Prefers a reason shared by every
   * withheld type; falls back to `BELOW_MINIMUM` when the total is the problem.
   */
  blockingReason: ClaimBlockingReason | null;
}

function toBigInt(value: string | undefined): bigint {
  if (!value) {
    return 0n;
  }
  try {
    return BigInt(value);
  } catch {
    // A malformed amount must read as "nothing to claim", never as a crash on
    // the earnings screen.
    return 0n;
  }
}

/**
 * Turns the trimmed summary payload into everything the CTA and the claim
 * sheet need. Lives here rather than inline in both so the two can never
 * disagree about what a claim would pay.
 *
 * @param summary - The scoped summary, or null while it loads.
 * @param scope - The origin types the current screen requested.
 * @returns The derived claimability.
 */
export function deriveClaimability(
  summary: EarningsSummaryDto | null | undefined,
  scope: EarningOriginType[],
): Claimability {
  if (!summary) {
    return {
      claimable: 0n,
      claimableTypes: [],
      withheldTypes: [],
      coverage: 'none',
      isBelowMinimum: false,
      canClaim: false,
      blockingReason: null,
    };
  }

  const claimableTypes: EarningOriginType[] = [];
  const withheldTypes: EarningOriginType[] = [];
  const withheldReasons: (ClaimBlockingReason | null)[] = [];

  for (const originType of scope) {
    const totals = summary.by_earning_origin_type[originType];
    if (toBigInt(totals?.claimable) > 0n) {
      claimableTypes.push(originType);
    } else {
      withheldTypes.push(originType);
      withheldReasons.push(totals?.blocking_reason ?? null);
    }
  }

  const claimable = toBigInt(summary.claimable);
  const minimum = toBigInt(summary.minimum_musd_base_units);
  const isBelowMinimum = claimable > 0n && claimable < minimum;
  const canClaim = claimableTypes.length > 0 && !isBelowMinimum;

  let coverage: ClaimCoverage;
  if (claimableTypes.length === 0) {
    coverage = 'none';
  } else if (withheldTypes.length === 0) {
    coverage = 'all';
  } else {
    coverage = 'partial';
  }

  let blockingReason: ClaimBlockingReason | null = null;
  if (isBelowMinimum) {
    blockingReason = 'BELOW_MINIMUM';
  } else if (withheldReasons.length > 0) {
    const present = withheldReasons.filter(
      (reason): reason is ClaimBlockingReason => reason !== null,
    );
    // Only report a reason the whole withheld set agrees on. A mixed set has no
    // single explanation, and guessing one would mislabel the other half.
    if (present.length > 0 && new Set(present).size === 1) {
      blockingReason = present[0];
    }
  }

  return {
    claimable,
    claimableTypes,
    withheldTypes,
    coverage,
    isBelowMinimum,
    canClaim,
    blockingReason,
  };
}
