import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';

/**
 * Market-cap value (USD) at which each launchpad's bonding curve graduates a
 * token onto a DEX pool. Used to derive the "$ to graduation" figure from the
 * API's `graduationPercent` until the token API exposes the target directly.
 */
export const GRADUATION_TARGET_USD_BY_LAUNCHPAD: Readonly<
  Record<string, number>
> = {
  pumpfun: 69_000,
  letsbonk: 30_000,
  fourmeme: 48_000,
};

export const DEFAULT_GRADUATION_TARGET_USD = 69_000;

/** The two pre-graduation stages the progress UI covers. */
export type GraduationStage = 'new' | 'bonding';

export interface GraduationProgressViewModel {
  stage: GraduationStage;
  /** Bonding-curve completion in percent, clamped to 0–100. */
  percent: number;
  /** Derived USD market cap the curve has raised so far. */
  raisedUsd: number;
  /** Derived USD market cap still missing to graduate. */
  remainingUsd: number;
}

/**
 * Parses the raw `graduationPercent`, which the API types as `number | null`
 * but serializes as a JSON string. Unusable values become `null`.
 */
export const parseGraduationPercent = (
  raw: number | string | null | undefined,
): number | null => {
  if (raw == null || (typeof raw === 'string' && raw.trim().length === 0)) {
    return null;
  }
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(100, Math.max(0, parsed));
};

/**
 * The one visibility predicate for the graduation progress UI: only pre-
 * graduation launchpad tokens with a usable percent show progress. Both
 * `created` (the API's documented value) and `new` (seen in harness fixtures)
 * map to the new-token stage. Graduated, migrated, unknown stages and tokens
 * without `launchpadData` never do.
 */
export const isGraduationProgressVisible = (
  launchpadData: TokenAssetLaunchpadData | null | undefined,
): boolean => {
  if (launchpadData == null) {
    return false;
  }
  const percent = parseGraduationPercent(launchpadData.graduationPercent);
  if (percent == null) {
    return false;
  }
  if (
    launchpadData.graduationStage === 'created' ||
    launchpadData.graduationStage === 'new'
  ) {
    return true;
  }
  return launchpadData.graduationStage === 'bonding' && percent < 100;
};

/**
 * Derives everything the header fuse bar and its microcopy render. Returns
 * `null` whenever `isGraduationProgressVisible` is false.
 */
export const getGraduationProgressViewModel = (
  launchpadData: TokenAssetLaunchpadData | null | undefined,
  launchpad: string | null | undefined,
): GraduationProgressViewModel | null => {
  if (!isGraduationProgressVisible(launchpadData)) {
    return null;
  }
  const percent = parseGraduationPercent(
    launchpadData?.graduationPercent,
  ) as number;
  const protocol = launchpad ?? launchpadData?.protocol ?? undefined;
  const targetUsd =
    (protocol != null && GRADUATION_TARGET_USD_BY_LAUNCHPAD[protocol]) ||
    DEFAULT_GRADUATION_TARGET_USD;
  return {
    stage: launchpadData?.graduationStage === 'bonding' ? 'bonding' : 'new',
    percent,
    raisedUsd: (percent / 100) * targetUsd,
    remainingUsd: ((100 - percent) / 100) * targetUsd,
  };
};

/**
 * Integer percent for display. A bonding token that rounds up to `100%` while
 * still short of graduation shows `99%`, so the copy never claims graduation
 * early.
 */
export const getGraduationDisplayPercent = (percent: number): number => {
  const rounded = Math.round(percent);
  if (percent < 100 && rounded === 100) {
    return 99;
  }
  return Math.min(100, Math.max(0, rounded));
};
