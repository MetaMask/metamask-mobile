import { useSelector } from 'react-redux';
import {
  getHeadlessAllProvidersMinimumVersion,
  isHeadlessAllProvidersEnabled,
} from '@metamask/ramps-controller';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import { selectRemoteFeatureFlagControllerState } from '../../../../selectors/featureFlagController';

/**
 * Whether the Headless Buy all-providers remote feature flag
 * (`moneyHeadlessAllProviders`) is enabled for THIS app version.
 *
 * Thin Redux binding over the core-exported helpers, which own the flag key
 * lookup, the `localOverrides` merge (so the Settings > Feature flag override
 * screen works as a dev override), and payload coercion: an enabled object
 * payload must carry the matching `featureVersion`, and only the literal
 * boolean `true` enables the boolean form. `RampsController` resolves the
 * same helpers against the same controller state for its quote widening, so
 * this UI gate and the controller cannot disagree.
 *
 * Version gating has two layers (docs/readme/version-gated-feature-flags.md):
 * the LaunchDarkly `versions` wrapper keeps the flag from reaching clients
 * below the target release at all, and when the payload carries a
 * `minimumVersion` this hook additionally validates it against the running
 * app version through the shared `validatedVersionGatedFeatureFlag` util. A
 * payload without `minimumVersion` (dev overrides, QA forcing via the
 * boolean form) skips the client-side check and relies on the server-side
 * wrapper alone.
 *
 * @returns Whether all provider classes are enabled for the headless fiat
 * flow on this app version. A missing flag, a stale `featureVersion`, or an
 * unmet `minimumVersion` keeps the native-only default.
 */
export function useHeadlessAllProvidersEnabled(): boolean {
  const remoteFeatureFlagControllerState = useSelector(
    selectRemoteFeatureFlagControllerState,
  );
  const enabled = isHeadlessAllProvidersEnabled(
    remoteFeatureFlagControllerState,
  );
  if (!enabled) {
    return false;
  }
  const minimumVersion = getHeadlessAllProvidersMinimumVersion(
    remoteFeatureFlagControllerState,
  );
  if (!minimumVersion) {
    return true;
  }
  return (
    validatedVersionGatedFeatureFlag({ enabled: true, minimumVersion }) ?? false
  );
}

export default useHeadlessAllProvidersEnabled;
