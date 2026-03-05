/**
 * Wrapper around the dynamic BLE transport import.
 *
 * Extracted to a static-import module so tests can mock it with jest.mock(),
 * which does not intercept native dynamic import() in the Node 22 test env.
 */
import type { BluetoothInterface } from './useBluetoothDevices';

type BleTransportModule = {
  default: { open: (deviceId: string) => Promise<BluetoothInterface> };
};
const loadBleTransport = async (
  deviceId: string,
): Promise<BluetoothInterface> => {
  const BluetoothTransport = (await import(
    '@ledgerhq/react-native-hw-transport-ble'
  )) as BleTransportModule;
  return BluetoothTransport.default.open(deviceId);
};

export default loadBleTransport;
