/**
 * Pay-scenario feature flag PRESETS.
 * Contains a shared base builder that mirrors the RC configuration for Pay domains
 * (perps, predict, money-account, confirmations), plus scenario-specific layers.
 */

import { BASE_FLAGS_DATA } from './base-flags.js';

/**
 * Generates the base feature flags from the RC dataset.
 * It flattens the RC array format into the Record<string, unknown> override map
 * expected by setupRemoteFeatureFlagsMock.
 */
export function getBaseFlags(): Record<string, unknown> {
  return BASE_FLAGS_DATA.reduce(
    (acc, flagObj) => ({ ...acc, ...flagObj }),
    {} as Record<string, unknown>,
  );
}

/**
 * Returns the remote feature flag overrides necessary to enable Perps deposit,
 * layered on top of the base RC configuration.
 *
 * NOTE: For testing in versions >= 8.5.0, the native version-gated object configuration
 * (e.g. { enabled: true, minimumVersion: "8.5.0" }) in the RC base is sufficient to enable
 * Activity redesign logic.
 */
export function perpsDepositFlags(): Record<string, unknown> {
  return {
    ...getBaseFlags(),
    // Scenario-specific overrides can be added here if they differ from the RC base
    perpsPerpTradingEnabled: { enabled: true, minimumVersion: '0.0.0' },
  };
}

/**
 * Returns the remote feature flag overrides necessary to enable Predict deposit,
 * layered on top of the base RC configuration.
 */
export function predictDepositFlags(): Record<string, unknown> {
  return {
    ...getBaseFlags(),
    predictTradingEnabled: { enabled: true, minimumVersion: '0.0.0' },
  };
}

/**
 * Returns the remote feature flag overrides necessary to enable Money Account deposit,
 * layered on top of the base RC configuration.
 */
export function moneyAccountDepositFlags(): Record<string, unknown> {
  return {
    ...getBaseFlags(),
    moneyEnableMoneyAccount: { enabled: true, minimumVersion: '0.0.0' },
    moneyHomeScreenEnabled: { enabled: true, minimumVersion: '0.0.0' },
  };
}
