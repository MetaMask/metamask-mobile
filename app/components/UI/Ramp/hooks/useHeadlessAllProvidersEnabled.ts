import { useSelector } from 'react-redux';
import { isHeadlessAllProvidersEnabled } from '@metamask/ramps-controller';
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
 * @returns Whether all provider classes are enabled for the headless fiat
 * flow. A missing flag or stale `featureVersion` keeps the native-only
 * default.
 */
export function useHeadlessAllProvidersEnabled(): boolean {
  const remoteFeatureFlagControllerState = useSelector(
    selectRemoteFeatureFlagControllerState,
  );
  return isHeadlessAllProvidersEnabled(
    remoteFeatureFlagControllerState,
  );
}

export default useHeadlessAllProvidersEnabled;
