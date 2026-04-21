import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import useBluetooth from '../../../hooks/Ledger/useBluetooth';
import useBluetoothPermissions from '../../../hooks/useBluetoothPermissions';
import useBluetoothDevices, {
  type BluetoothDevice,
} from '../../../hooks/Ledger/useBluetoothDevices';
import LedgerDiscoverySearching from './LedgerDiscoverySearching';
import { LedgerDiscoveryFoundView } from './LedgerDiscoveryFound';
import { LedgerDiscoverySelectDeviceView } from './LedgerDiscoverySelectDevice';
import LedgerDiscoveryNotFound from './LedgerDiscoveryNotFound';
import LedgerDiscoveryAccountSelection from './LedgerDiscoveryAccountSelection';
import { LEDGER_DISCOVERY_TIMEOUT_MS } from './LedgerDiscovery.types';

type LedgerDiscoveryStep = 'searching' | 'found' | 'not-found' | 'accounts';

const LedgerDiscoveryFlow = () => {
  const navigation = useNavigation();
  const { hasBluetoothPermissions } = useBluetoothPermissions();
  const [step, setStep] = useState<LedgerDiscoveryStep>('searching');
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>(
    [],
  );
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(
    null,
  );
  const [isSelectingDevice, setIsSelectingDevice] = useState(false);

  const isSearching = step === 'searching';
  const { bluetoothOn, bluetoothConnectionError } = useBluetooth(
    hasBluetoothPermissions && isSearching,
  );
  const { devices, deviceScanError } = useBluetoothDevices(
    hasBluetoothPermissions && isSearching,
    bluetoothOn && isSearching,
  );

  useEffect(() => {
    if (!isSearching || devices.length <= 0) {
      return;
    }

    setDiscoveredDevices(devices);
    setSelectedDevice(devices[0]);
    setStep('found');
  }, [devices, isSearching]);

  useEffect(() => {
    if (!isSearching) {
      return;
    }

    if (deviceScanError || bluetoothConnectionError) {
      setStep('not-found');
      return;
    }

    const timeoutId = setTimeout(() => {
      setStep('not-found');
    }, LEDGER_DISCOVERY_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [bluetoothConnectionError, deviceScanError, isSearching]);

  const selectedDeviceId = selectedDevice?.id ?? discoveredDevices[0]?.id;

  const content = useMemo(() => {
    if (step === 'accounts' && selectedDevice) {
      return (
        <LedgerDiscoveryAccountSelection
          selectedDevice={selectedDevice}
          onBack={() => setStep('found')}
        />
      );
    }

    if (step === 'not-found') {
      return <LedgerDiscoveryNotFound />;
    }

    if (step === 'found' && selectedDevice) {
      return (
        <>
          <LedgerDiscoveryFoundView
            deviceName={selectedDevice.name}
            onOpenSelectDevice={() => setIsSelectingDevice(true)}
            onConnectLedger={() => setStep('accounts')}
          />
          {isSelectingDevice ? (
            <LedgerDiscoverySelectDeviceView
              devices={discoveredDevices}
              selectedDeviceId={selectedDeviceId ?? ''}
              onSelectDevice={setSelectedDevice}
              onClose={() => setIsSelectingDevice(false)}
              onSave={() => {
                setIsSelectingDevice(false);
                setStep('accounts');
              }}
            />
          ) : null}
        </>
      );
    }

    return <LedgerDiscoverySearching />;
  }, [
    discoveredDevices,
    isSelectingDevice,
    selectedDevice,
    selectedDeviceId,
    step,
  ]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  return content;
};

export default LedgerDiscoveryFlow;
