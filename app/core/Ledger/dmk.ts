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
 * Module-level singleton for the Ledger DMK mode. Engine initializes it
 * before constructing the keyring; adapter creation reads the same value.
 * `undefined` until initialization.
 */
let ledgerDmkEnabled: boolean | undefined;

/**
 * Seed the process mode from merged persisted feature flags (remote flags
 * overlaid by local overrides; `LEDGER_FORCE_DMK` is honored). Only Engine
 * initialization should call this; tests call it with `{}` to reset.
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
 * @throws If read before initialization — no silent fallback, since guessing
 * could put the keyring and adapter on different Ledger stacks.
 * @returns Whether the DMK stack is active.
 */
export const getLedgerDmkMode = (): boolean => {
  if (ledgerDmkEnabled === undefined) {
    throw new Error('Ledger DMK mode accessed before Engine initialization');
  }
  return ledgerDmkEnabled;
};
