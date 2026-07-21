import { useSelector } from 'react-redux';
import { isHeadlessAllProvidersEnabled } from '@metamask/ramps-controller';
import { selectRemoteFeatureFlagControllerState } from '../../../../selectors/featureFlagController';

/**
 * Whether the Headless Buy all-providers remote feature flag
 * (`moneyHeadlessAllProviders`) is enabled.
 *
 * Thin Redux binding over the core-exported `isHeadlessAllProvidersEnabled`
 * helper, which owns the flag key lookup, the `localOverrides` merge (so the
 * Settings > Feature flag override screen works as a dev override), and
 * boolean coercion (only the literal `true` enables). `RampsController`
 * resolves the same helper against the same controller state for its quote
 * widening, so this UI gate and the controller cannot disagree.
 *
 * @returns Whether all provider classes are enabled for the headless fiat
 * flow. `false` or a missing flag keeps the native-only default.
 */
export function useHeadlessAllProvidersEnabled(): boolean {
  const remoteFeatureFlagControllerState = useSelector(
    selectRemoteFeatureFlagControllerState,
  );
  return isHeadlessAllProvidersEnabled(remoteFeatureFlagControllerState);
}

export default useHeadlessAllProvidersEnabled;
