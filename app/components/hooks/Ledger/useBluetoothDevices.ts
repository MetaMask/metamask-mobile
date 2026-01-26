import { useEffect, useState } from 'react';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import { Observable, Observer, Subscription } from 'rxjs';

export interface BluetoothDevice {
  id: string;
  name: string;
  serviceUUIDs: string[];
}

// Works with any Bluetooth Interface that provides a listen method
export interface BluetoothInterface {
  listen(
    observer: Observer<{
      type: string;
      descriptor: { id: string };
    }>,
  ): { unsubscribe: () => void };
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (event: any) => void): void;
  close(): void;
}

export interface ObservableEventType {
  type: string;
  descriptor: BluetoothDevice;
  deviceModel: never;
}

const useBluetoothDevices = (
  hasBluetoothPermissions: boolean,
  bluetoothOn: boolean,
) => {
  const [devices, setDevices] = useState<Record<string, BluetoothDevice>>({});
  const [deviceScanError, setDeviceScanError] = useState<boolean>(false);
  const [observableEvent, setObservableEvent] = useState<ObservableEventType>();

  // Initiate scanning and pairing if bluetooth is enabled
  useEffect(() => {
    let subscription: Subscription;

    console.log(
      '[DEBUG useBluetoothDevices] Starting scan effect, hasBluetoothPermissions:',
      hasBluetoothPermissions,
      'bluetoothOn:',
      bluetoothOn,
    );

    if (hasBluetoothPermissions && bluetoothOn) {
      console.log(
        '[DEBUG useBluetoothDevices] Starting TransportBLE.listen subscription',
      );
      subscription = new Observable(TransportBLE.listen).subscribe({
        next: (e: ObservableEventType) => {
          console.log(
            '[DEBUG useBluetoothDevices] Received event:',
            e.type,
            e.descriptor?.name,
            e.descriptor?.id,
          );
          setObservableEvent(e);
        },
        error: (error) => {
          console.log('[DEBUG useBluetoothDevices] Scan error:', error);
          setDeviceScanError(true);
        },
      });
    }

    return () => {
      console.log('[DEBUG useBluetoothDevices] Cleaning up subscription');
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBluetoothPermissions, bluetoothOn]);

  useEffect(() => {
    if (observableEvent?.descriptor) {
      const btDevice = observableEvent.descriptor;
      const deviceFound = devices[btDevice.id];
      console.log(
        '[DEBUG useBluetoothDevices] Processing event:',
        observableEvent.type,
        'device:',
        btDevice.name,
        'already found:',
        !!deviceFound,
      );

      if (observableEvent.type === 'add' && !deviceFound) {
        console.log(
          '[DEBUG useBluetoothDevices] Adding new device:',
          btDevice.name,
          btDevice.id,
        );
        setDevices((prevValues) => ({
          ...prevValues,
          [btDevice.id]: btDevice,
        }));
        setDeviceScanError(false);
      }
    }
  }, [observableEvent, devices]);

  return {
    deviceScanError,
    devices: Object.values(devices),
  };
};

export default useBluetoothDevices;
