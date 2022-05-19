import { useEffect, useState } from 'react';
import { Observable, Subscription } from 'rxjs';
import BluetoothTransport from '@ledgerhq/react-native-hw-transport-ble';
import { Device } from '@ledgerhq/react-native-hw-transport-ble/lib/types';

const useBluetoothDevices = (
  hasBluetoothPermissions: boolean,
  bluetoothOn: boolean,
) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceScanError, setDeviceScanError] = useState<boolean>();

  // Initiate scanning and pairing if bluetooth is enabled
  useEffect(() => {
    let subscription: Subscription;

    if (hasBluetoothPermissions && bluetoothOn) {
      subscription = new Observable(BluetoothTransport.listen).subscribe({
        next: (e: any) => {
          const deviceFound = devices.some((d) => d.id === e.descriptor.id);
          if (e.type === 'add' && !deviceFound) {
            setDevices([...devices, e?.descriptor]);
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
    devices,
  };
};

export default useBluetoothDevices;
