import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { FeatureFlagNames } from '../../../../constants/featureFlags';

const FLAG_KEY = FeatureFlagNames.forceRampsStagingEnvironment;

/**
 * Determines whether the `force-ramps-staging-environment` feature flag
 * is enabled, reading directly from the RemoteFeatureFlagController state.
 *
 * Merges `localOverrides` on top of `remoteFeatureFlags` so that the
 * Settings > Feature Flag Override page also works for this flag.
 *
 * @param controllerState - The current RemoteFeatureFlagController state.
 * @returns `true` when the flag forces Ramps services to staging.
 */
export function getForceRampsStaging(
  controllerState: RemoteFeatureFlagControllerState | undefined,
): boolean {
  try {
    if (!controllerState) {
      return false;
    }
    const remote = controllerState.remoteFeatureFlags ?? {};
    const local = controllerState.localOverrides ?? {};
    const merged = { ...remote, ...local };
    return merged[FLAG_KEY] === true;
  } catch {
    return false;
  }
}
