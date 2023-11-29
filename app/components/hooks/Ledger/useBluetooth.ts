import { useState, useEffect } from 'react';
import { State } from 'react-native-ble-plx';
import { Subscription } from 'rxjs';

const useBluetooth = (hasBluetoothPermissions: boolean) => {
  const [bluetoothOn, setBluetoothOn] = useState(false);
  const [bluetoothConnectionError, setBluetoothConnectionError] =
    useState<boolean>();

  // Monitoring for the BLE adapter to be turned on
  useEffect(() => {
    if (hasBluetoothPermissions) {
      let subscription: Subscription;

      import('@ledgerhq/react-native-hw-transport-ble').then(
        (BluetoothTransport: any) => {
          subscription = BluetoothTransport.default.observeState({
            next: (e: { available: boolean; type: State }) => {
              if (e.available && e.type === State.PoweredOn && !bluetoothOn) {
                setBluetoothOn(true);
                setBluetoothConnectionError(false);
              }

              if (!e.available && e.type === State.PoweredOff) {
                setBluetoothOn(false);
                setBluetoothConnectionError(true);
              }
            },
          });
        },
      );

      return () => subscription?.unsubscribe();
    }
  }, [hasBluetoothPermissions, bluetoothOn]);

  return {
    bluetoothOn,
    bluetoothConnectionError,
  };
};

export default useBluetooth;
