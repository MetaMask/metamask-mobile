import { validatedVersionGatedFeatureFlag } from '../../util/remoteFeatureFlag';
import { FeatureFlagNames } from '../../constants/featureFlags';

// TEMP — DO NOT MERGE. Hardcoded in place of the `LEDGER_FORCE_DMK` env read so
// CI-signed device builds run the DMK stack without depending on the `ledgerDmk`
// remote flag (which currently resolves to `false` for every app version because
// its `minimumVersion` is `null`) or on `.js.env`, which CI never sources.
// Revert to `process.env.LEDGER_FORCE_DMK === 'true'` before merging.
const FORCE_DMK = true;

/**
 * Whether the Ledger DMK stack is enabled, read fresh from the merged feature
 * flags. Pure — no caching; callers pass the current flag state.
 *
 * Resolution: `LEDGER_FORCE_DMK=true` env var (build-time override) takes
 * precedence; otherwise the `ledgerDmk` flag is resolved — a boolean value is
 * used directly (dev-tool override), otherwise the version-gated remote flag is
 * evaluated via `validatedVersionGatedFeatureFlag`. Defaults to `false`. Mirrors
 * the `selectLedgerDmkEnabled` Redux selector.
 *
 * Both the keyring (at engine init, reading persisted state) and the adapter
 * factory (in `useAdapterLifecycle`, reading live state) call this, so they
 * agree as long as the flag is stable across the two reads.
 */
export const isDmkEnabled = (
  flags: Record<string, unknown> | null | undefined = {},
): boolean => {
  if (FORCE_DMK) return true;
  if (!flags || !(FeatureFlagNames.ledgerDmk in flags)) return false;
  const raw = flags[FeatureFlagNames.ledgerDmk];
  return typeof raw === 'boolean'
    ? raw
    : (validatedVersionGatedFeatureFlag(raw) ?? false);
};
