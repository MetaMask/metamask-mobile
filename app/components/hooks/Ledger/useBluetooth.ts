import { useEffect } from 'react';
import { Subscription } from 'rxjs';

const useBluetooth = (hasBluetoothPermissions: boolean) => {
  const bluetoothOn = false;
  const bluetoothConnectionError = undefined;

  // Monitoring for the BLE adapter to be turned on
  useEffect(() => {
    if (hasBluetoothPermissions) {
      let subscription: Subscription;

      return () => subscription?.unsubscribe();
    }
  }, [hasBluetoothPermissions, bluetoothOn]);

  return {
    bluetoothOn,
    bluetoothConnectionError,
  };
};

export default useBluetooth;
