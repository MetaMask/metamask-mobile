import {
  DeviceManagementKitBuilder,
  type DeviceManagementKit,
} from '@ledgerhq/device-management-kit';
import { RNBleTransportFactory } from '@ledgerhq/device-transport-kit-react-native-ble';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { hasMinimumRequiredVersion } from '../../util/remoteFeatureFlag';

const DMK_FEATURE_FLAG_KEY = 'enableDMK';

interface RemoteFeatureFlagControllerState {
  remoteFeatureFlags?: Record<string, unknown>;
  localOverrides?: Record<string, unknown>;
}

/**
 * Cached DMK flag, resolved once at startup from wallet state via
 * {@link resolveDmkEnabledFromState}. Consumers call {@link isDmkEnabled}
 * (no args) to read the cached value.
 */
let dmkEnabledCache: boolean | null = null;

/**
 * Resolve whether the DMK-enabled Ledger adapter should be used, reading
 * from the provided flag state. Local overrides take precedence over
 * remote values. Supports both the version-gated shape
 * (`{ enabled, minimumVersion }`) and boolean dev-tool overrides.
 *
 * Call once at startup with the persisted
 * `RemoteFeatureFlagController` state. The result is cached and
 * consumed by {@link isDmkEnabled}.
 *
 * @param controllerState - The `RemoteFeatureFlagController` state (local
 * overrides will be undefined at startup — they are runtime-only dev-tool values).
 * @returns The effective DMK flag value.
 */
export const resolveDmkEnabledFromState = (
  controllerState: Partial<RemoteFeatureFlagControllerState>,
): boolean => {
  try {
    // Local overrides (dev tools) take precedence over remote flags
    const localOverride =
      controllerState?.localOverrides?.[DMK_FEATURE_FLAG_KEY];
    const remoteValue =
      controllerState?.remoteFeatureFlags?.[DMK_FEATURE_FLAG_KEY];
    const dmkFlag = localOverride ?? remoteValue;

    // Boolean dev-tool override (e.g. set via Developer Options toggle)
    if (typeof dmkFlag === 'boolean') {
      dmkEnabledCache = dmkFlag;
      return dmkFlag;
    }

    if (dmkFlag && typeof dmkFlag === 'object' && 'enabled' in dmkFlag) {
      const result =
        (dmkFlag as { enabled: boolean }).enabled &&
        hasMinimumRequiredVersion(
          (dmkFlag as unknown as { minimumVersion: string }).minimumVersion,
        );
      dmkEnabledCache = result;
      return result;
    }
    dmkEnabledCache = false;
    return false;
  } catch (error) {
    DevLogger.log(
      '[DMK] Failed to resolve enableDMK feature flag, defaulting to false:',
      error,
    );
    dmkEnabledCache = false;
    return false;
  }
};

/**
 * Returns the cached DMK-enabled flag resolved at startup via
 * {@link resolveDmkEnabledFromState}. Returns `false` before initialization
 * (useful for tests that don't call `resolveDmkEnabledFromState`).
 */
export const isDmkEnabled = (): boolean => dmkEnabledCache ?? false;

const state: { dmk: DeviceManagementKit | null } = { dmk: null };

export const getDmk = (): DeviceManagementKit => {
  if (!state.dmk) {
    DevLogger.log('[DMK] Building DeviceManagementKit...');
    try {
      state.dmk = new DeviceManagementKitBuilder()
        .addTransport(RNBleTransportFactory)
        .build();
      DevLogger.log('[DMK] DeviceManagementKit built successfully');
    } catch (error) {
      DevLogger.log('[DMK] Failed to build DeviceManagementKit:', error);
      throw error;
    }
  } else {
    DevLogger.log('[DMK] Returning cached DeviceManagementKit instance');
  }
  return state.dmk;
};

export const resetDmk = (): void => {
  DevLogger.log('[DMK] Resetting DeviceManagementKit instance');
  state.dmk = null;
};
