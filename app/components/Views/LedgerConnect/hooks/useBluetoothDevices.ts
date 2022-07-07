import { useEffect, useState } from 'react';
import { Observable, Observer, Subscription } from 'rxjs';
import BluetoothTransport from '@ledgerhq/react-native-hw-transport-ble';

export interface BluetoothDevice {
  id: string;
  name: string;
}

// Works with any Bluetooth Interface that provides a listen method
export interface BluetoothInterface {
  listen(
    observer: Observer<{
      type: string;
      descriptor: { id: string };
    }>,
  ): { unsubscribe: () => void };
}

const useBluetoothDevices = (
  hasBluetoothPermissions: boolean,
  bluetoothOn: boolean,
  bluetoothInterface: BluetoothInterface = BluetoothTransport,
) => {
  const [devices, setDevices] = useState<Record<string, BluetoothDevice>>({});
  const [deviceScanError, setDeviceScanError] = useState<boolean>(false);

  // Initiate scanning and pairing if bluetooth is enabled
  useEffect(() => {
    let subscription: Subscription;

    if (hasBluetoothPermissions && bluetoothOn) {
      subscription = new Observable(bluetoothInterface.listen).subscribe({
        next: (e: any) => {
          const deviceFound = devices[e?.descriptor.id];

          if (e.type === 'add' && !deviceFound) {
            setDevices((prevValues) => ({
              ...prevValues,
              [e.descriptor.id]: e.descriptor,
            }));
            setDeviceScanError(false);
          }
        },
        error: (_error) => {
          setDeviceScanError(true);
        },
      });
    }

    return () => {
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBluetoothPermissions, bluetoothOn]);

  return {
    deviceScanError,
    devices: Object.values(devices),
  };
};

export default useBluetoothDevices;
