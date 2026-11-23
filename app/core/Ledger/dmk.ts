import { validatedVersionGatedFeatureFlag } from '../../util/remoteFeatureFlag';
import { FeatureFlagNames } from '../../constants/featureFlags';

/**
 * Whether the Ledger DMK stack is enabled for the given merged feature flags.
 * Pure — no caching.
 *
 * Resolution: `LEDGER_FORCE_DMK=true` (build-time env) wins; otherwise a
 * boolean `ledgerDmk` flag is used directly and a version-gated flag is
 * evaluated via `validatedVersionGatedFeatureFlag`. Defaults to `false`.
 * Mirrors the `selectLedgerDmkEnabled` Redux selector.
 */
export const isDmkEnabled = (
  flags: Record<string, unknown> | null | undefined = {},
): boolean => {
  if (process.env.LEDGER_FORCE_DMK === 'true') return true;
  if (!flags || !(FeatureFlagNames.ledgerDmk in flags)) return false;
  const raw = flags[FeatureFlagNames.ledgerDmk];
  return typeof raw === 'boolean'
    ? raw
    : (validatedVersionGatedFeatureFlag(raw) ?? false);
};

/**
 * Module-level holder for the Ledger DMK mode. Engine initialization seeds
 * it before constructing the keyring; adapter creation reads the same value.
 * `undefined` until the first Engine initialization; re-seeded on re-init.
 */
let ledgerDmkEnabled: boolean | undefined;

/**
 * Seed the mode from merged persisted feature flags (remote flags overlaid
 * by local overrides; `LEDGER_FORCE_DMK` is honored). Engine initialization
 * calls this before constructing the keyring.
 *
 * @param flags - Merged persisted feature flags.
 * @returns Whether the DMK stack is active.
 */
export const initializeLedgerDmkMode = (
  flags: Record<string, unknown> | null | undefined,
): boolean => {
  ledgerDmkEnabled = isDmkEnabled(flags);
  return ledgerDmkEnabled;
};

/**
 * Read the mode seeded at Engine initialization.
 *
 * Defaults to `false` (the legacy Ledger stack) if read before any Engine
 * initialization: adapter creation cannot happen before Engine exists, so
 * the default never selects a stack for an actual adapter, and it matches
 * the flag-off resolution of `isDmkEnabled`.
 *
 * @returns Whether the DMK stack is active.
 */
export const getLedgerDmkMode = (): boolean => ledgerDmkEnabled ?? false;
