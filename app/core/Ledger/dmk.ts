import {
  DeviceManagementKitBuilder,
  type DeviceManagementKit,
} from '@ledgerhq/device-management-kit';
import { RNBleTransportFactory } from '@ledgerhq/device-transport-kit-react-native-ble';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { hasMinimumRequiredVersion } from '../../util/remoteFeatureFlag';

const DMK_FEATURE_FLAG_KEY = 'enableDMK';

interface HasGetState {
  call: (action: 'RemoteFeatureFlagController:getState') => {
    remoteFeatureFlags?: Record<string, unknown>;
  };
}

export const isDmkEnabled = (messenger: HasGetState): boolean => {
  try {
    const flagState = messenger.call(
      'RemoteFeatureFlagController:getState',
    );
    const dmkFlag = flagState?.remoteFeatureFlags?.[DMK_FEATURE_FLAG_KEY];
    if (
      dmkFlag &&
      typeof dmkFlag === 'object' &&
      'enabled' in dmkFlag
    ) {
      return (
        (dmkFlag as { enabled: boolean }).enabled &&
        hasMinimumRequiredVersion(
          (dmkFlag as { minimumVersion: string }).minimumVersion,
        )
      );
    }
    return false;
  } catch {
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
