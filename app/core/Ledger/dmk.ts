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

export interface HasGetState {
  call: (
    action: 'RemoteFeatureFlagController:getState',
  ) => RemoteFeatureFlagControllerState;
}

/**
 * Resolves the effective DMK flag value, with local overrides taking
 * precedence over remote values. Supports both the version-gated shape
 * (`{ enabled, minimumVersion }`) and boolean dev-tool overrides.
 */
export const isDmkEnabled = (messenger: HasGetState): boolean => {
  try {
    const flagState = messenger.call('RemoteFeatureFlagController:getState');

    // Local overrides (dev tools) take precedence over remote flags
    const localOverride = flagState?.localOverrides?.[DMK_FEATURE_FLAG_KEY];
    const remoteValue = flagState?.remoteFeatureFlags?.[DMK_FEATURE_FLAG_KEY];
    const dmkFlag = localOverride ?? remoteValue;

    // Boolean dev-tool override (e.g. set via Developer Options toggle)
    if (typeof dmkFlag === 'boolean') {
      return dmkFlag;
    }

    if (dmkFlag && typeof dmkFlag === 'object' && 'enabled' in dmkFlag) {
      return (
        (dmkFlag as { enabled: boolean }).enabled &&
        hasMinimumRequiredVersion(
          (dmkFlag as unknown as { minimumVersion: string }).minimumVersion,
        )
      );
    }
    return false;
  } catch (error) {
    DevLogger.log(
      '[DMK] Failed to resolve enableDMK feature flag, defaulting to false:',
      error,
    );
    return false;
  }
};

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
