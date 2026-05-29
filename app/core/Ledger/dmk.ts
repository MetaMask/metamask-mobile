import { DeviceManagementKitBuilder } from '@ledgerhq/device-management-kit';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import { RNBleTransportFactory } from '@ledgerhq/device-transport-kit-react-native-ble';

const state: { dmk: DeviceManagementKit | null } = { dmk: null };

export const getDmk = (): DeviceManagementKit => {
  if (!state.dmk) {
    console.log('[DMK] Building DeviceManagementKit...');
    try {
      state.dmk = new DeviceManagementKitBuilder()
        .addTransport(RNBleTransportFactory)
        .build();
      console.log('[DMK] DeviceManagementKit built successfully');
    } catch (error) {
      console.log('[DMK] Failed to build DeviceManagementKit:', error);
      throw error;
    }
  } else {
    console.log('[DMK] Returning cached DeviceManagementKit instance');
  }
  return state.dmk;
};

export const resetDmk = (): void => {
  console.log('[DMK] Resetting DeviceManagementKit instance');
  state.dmk = null;
};
