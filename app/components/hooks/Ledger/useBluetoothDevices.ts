import { useEffect } from 'react';
import { Observer, Subscription } from 'rxjs';

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
  on(event: string, callback: (event: any) => void): void;
  close(): void;
}

const useBluetoothDevices = (
  hasBluetoothPermissions: boolean,
  bluetoothOn: boolean,
) => {
  const devices = {};
  const deviceScanError = false;

  // Initiate scanning and pairing if bluetooth is enabled
  useEffect(() => {
    let subscription: Subscription;

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
