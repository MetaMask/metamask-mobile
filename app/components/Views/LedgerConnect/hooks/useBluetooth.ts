import { useState, useEffect } from 'react';
import BluetoothTransport from '@ledgerhq/react-native-hw-transport-ble';
import { State } from 'react-native-ble-plx';

const useBluetooth = (hasBluetoothPermissions: boolean) => {
  const [bluetoothOn, setBluetoothOn] = useState(false);
  const [bluetoothConnectionError, setBluetoothConnectionError] =
    useState<boolean>();

  // Monitoring for the BLE adapter to be turned on
  useEffect(() => {
    if (hasBluetoothPermissions) {
      const subscription = BluetoothTransport.observeState({
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

      return () => subscription.unsubscribe();
    }
  }, [hasBluetoothPermissions, bluetoothOn]);

  return {
    bluetoothOn,
    bluetoothConnectionError,
  };
};

export default useBluetooth;
