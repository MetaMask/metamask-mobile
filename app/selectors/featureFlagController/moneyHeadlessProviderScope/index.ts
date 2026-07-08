import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import type { FiatProviderScope } from '../../../reducers/fiatOrders/types';

/**
 * Remote (LaunchDarkly) flag key for the Headless Buy provider-class expansion.
 * Exposed so the client-config / LaunchDarkly registry and this selector stay in
 * sync on the exact key string.
 */
export const MONEY_HEADLESS_PROVIDER_SCOPE_FLAG_KEY =
  'moneyHeadlessProviderScope' as const;

/**
 * Accepted variations for the multivariate string flag. Mirrors
 * `FiatProviderScope` so the remote value maps 1:1 onto the scope the
 * `RampsController` quote widening understands.
 */
const VALID_SCOPES: readonly FiatProviderScope[] = ['off', 'in-app', 'all'];

/**
 * Effective headless fiat provider-class scope as served by the remote feature
 * flag service.
 *
 * `moneyHeadlessProviderScope` is a multivariate string flag with variations
 * `off` | `in-app` | `all`, resolved per environment by LaunchDarkly (the
 * `RemoteFeatureFlagController` fetches the value for the current
 * `getFeatureFlagAppEnvironment()`). This is the activation switch for the
 * Headless Buy all-providers effort: any unset or unrecognized value resolves to
 * `off` (native-only), so the feature stays hard-off until the flag is
 * explicitly flipped, in every environment including production.
 *
 * @returns The remote provider scope, defaulting to `off`.
 */
export const selectMoneyHeadlessProviderScope = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): FiatProviderScope => {
    const value = remoteFeatureFlags?.[MONEY_HEADLESS_PROVIDER_SCOPE_FLAG_KEY];
    return VALID_SCOPES.includes(value as FiatProviderScope)
      ? (value as FiatProviderScope)
      : // TEMP: RC test for ETH -> mUSD deposit, revert before merge (default was 'off')
        'all';
  },
);
