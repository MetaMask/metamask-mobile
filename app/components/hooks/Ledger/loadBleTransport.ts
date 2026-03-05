/**
 * Wrapper around the dynamic BLE transport import.
 *
 * Extracted to a static-import module so tests can mock it with jest.mock(),
 * which does not intercept native dynamic import() in the Node 22 test env.
 */
const loadBleTransport = async (deviceId: string) => {
  const BluetoothTransport = await import(
    '@ledgerhq/react-native-hw-transport-ble'
  );
  return BluetoothTransport.default.open(deviceId);
};

export default loadBleTransport;
