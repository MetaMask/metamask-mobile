import {
  DistributionType,
  EnvironmentType,
} from '@metamask/remote-feature-flag-controller';
import type { Json } from '@metamask/utils';
import type { RootState } from '../../../../reducers';
import { selectDirectMoneyMusdForceOffSetting } from '../../../../reducers/fiatOrders';

// Points to the LaunchDarkly environment based on the METAMASK_ENVIRONMENT environment variable
export const getFeatureFlagAppEnvironment = () => {
  const env = process.env.METAMASK_ENVIRONMENT;

  switch (env) {
    case 'production':
      return EnvironmentType.Production;
    case 'beta':
      return EnvironmentType.Beta;
    // TODO: Remove pre-release case once verified that pre-release is no longer used
    case 'pre-release':
    case 'rc':
      return EnvironmentType.ReleaseCandidate;
    // TODO: Create LD environment for e2e and mirror test values
    case 'e2e':
    case 'test':
      return EnvironmentType.Test;
    case 'exp':
      return EnvironmentType.Exp;
    case 'dev':
      return EnvironmentType.Development;
    default:
      return EnvironmentType.Development;
  }
};

export const getFeatureFlagAppDistribution = () => {
  const dist = process.env.METAMASK_BUILD_TYPE;

  switch (dist) {
    case 'main':
      return DistributionType.Main;
    case 'flask':
      return DistributionType.Flask;
    default:
      return DistributionType.Main;
  }
};

export const isRemoteFeatureFlagOverrideActivated =
  process.env.OVERRIDE_REMOTE_FEATURE_FLAGS === 'true';

// Non-production dev override for the direct-mUSD vs buy-ETH fiat route.
// Reads the persisted HeadlessPlayground toggle
// (`selectDirectMoneyMusdForceOffSetting`), but production is hard-gated OFF so
// the real LaunchDarkly value always wins there regardless of the persisted
// setting. Mirrors the provider-scope dev-toggle pattern
// (`getEffectiveProviderScope`). When this returns true, the Engine forces
// `confirmations_pay_fiat.directMoneyMusdEnabled` OFF so the Money Account fiat
// deposit takes the buy-ETH-then-convert fallback path (needed for regions
// without an mUSD provider, e.g. New York).
export const getEffectiveDirectMoneyMusdForceOff = (
  state: RootState,
): boolean => {
  if (getFeatureFlagAppEnvironment() === EnvironmentType.Production) {
    return false;
  }
  return selectDirectMoneyMusdForceOffSetting(state);
};

// Core (`@metamask/transaction-pay-controller` `getDirectMoneyMusdEnabled`) reads
// `remoteFeatureFlags.confirmations_pay_fiat.directMoneyMusdEnabled === true`.
// On RC that flag is currently true, which routes the Money Account fiat deposit
// through the mUSD-direct path. Regions without an mUSD provider (e.g. New York)
// get no quotes there, so we force it OFF to take the buy-ETH-then-convert path.
// Returns the same reference when no change is needed so callers can skip
// redundant controller updates (and avoid re-entrant stateChange loops). Other
// keys in confirmations_pay_fiat are preserved.
export const withDirectMoneyMusdOff = (
  remoteFeatureFlags: Record<string, Json>,
): Record<string, Json> => {
  const payFiat = remoteFeatureFlags?.confirmations_pay_fiat as
    | Record<string, Json>
    | undefined;

  if (!payFiat || payFiat.directMoneyMusdEnabled === false) {
    return remoteFeatureFlags;
  }

  return {
    ...remoteFeatureFlags,
    confirmations_pay_fiat: {
      ...payFiat,
      directMoneyMusdEnabled: false,
    },
  };
};
