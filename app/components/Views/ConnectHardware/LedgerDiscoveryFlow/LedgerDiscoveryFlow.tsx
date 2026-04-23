import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { LedgerBluetoothAdapter } from '../../../../core/HardwareWallet/adapters/LedgerBluetoothAdapter';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';
import { BluetoothPermissionErrors } from '../../../../core/Ledger/ledgerErrors';
import useBluetoothPermissions from '../../../hooks/useBluetoothPermissions';
import LedgerDiscoverySearching from './LedgerDiscoverySearching';
import { LedgerDiscoveryFoundView } from './LedgerDiscoveryFound';
import { LedgerDiscoverySelectDeviceView } from './LedgerDiscoverySelectDevice';
import LedgerDiscoveryNotFound from './LedgerDiscoveryNotFound';
import LedgerDiscoveryAccountSelection from './LedgerDiscoveryAccountSelection';
import {
  LedgerBluetoothAccessDenied,
  LedgerBluetoothConnectionFailed,
  LedgerBluetoothOff,
  LedgerEthAppClosed,
  LedgerIsLocked,
  LedgerLocationAccessDenied,
  LedgerNearbyDevicesDenied,
  LedgerUnresponsive,
} from './errors';
import {
  LEDGER_DISCOVERY_TIMEOUT_MS,
  type LedgerDiscoveryStep,
} from './LedgerDiscovery.types';

const LedgerDiscoveryFlow = () => {
  const navigation = useNavigation();
  const { hasBluetoothPermissions, bluetoothPermissionError } =
    useBluetoothPermissions();
  const [step, setStep] = useState<LedgerDiscoveryStep>('searching');
  const [discoveredDevices, setDiscoveredDevices] = useState<
    DiscoveredDevice[]
  >([]);
  const [selectedDevice, setSelectedDevice] =
    useState<DiscoveredDevice | null>(null);
  const [isSelectingDevice, setIsSelectingDevice] = useState(false);

  const adapterRef = useRef<LedgerBluetoothAdapter | null>(null);
  const scanCleanupRef = useRef<(() => void) | null>(null);
  const transportUnsubscribeRef = useRef<(() => void) | null>(null);
  const isSearchingRef = useRef(false);
  const [bluetoothOn, setBluetoothOn] = useState(false);
  // True once the first transport state event has been received from the adapter.
  // Distinguishes "not yet initialised" from "explicitly off".
  const [bluetoothStateReceived, setBluetoothStateReceived] = useState(false);
  const [bluetoothError, setBluetoothError] = useState<Error | null>(null);
  const [scanError, setScanError] = useState<Error | null>(null);

  const isSearching = step === 'searching';
  isSearchingRef.current = isSearching;

  // Route to the appropriate permission-error screen whenever the OS permission
  // check returns a denial. The hook re-runs whenever the app becomes active so
  // this also handles the case where the user grants permission in Settings and
  // then returns to the app.
  useEffect(() => {
    if (!bluetoothPermissionError) return;

    switch (bluetoothPermissionError) {
      case BluetoothPermissionErrors.BluetoothAccessBlocked:
        setStep('bluetooth-access-denied');
        break;
      case BluetoothPermissionErrors.LocationAccessBlocked:
        setStep('location-access-denied');
        break;
      case BluetoothPermissionErrors.NearbyDevicesAccessBlocked:
        setStep('nearby-devices-denied');
        break;
    }
  }, [bluetoothPermissionError]);

  // Create adapter when searching begins
  useEffect(() => {
    if (!hasBluetoothPermissions || !isSearching) {
      return;
    }

    const adapter = new LedgerBluetoothAdapter({
      onDisconnect: (error) => {
        if (error) {
          setBluetoothError(error);
        }
      },
      onDeviceEvent: () => undefined,
    });
    adapterRef.current = adapter;

    // Monitor bluetooth state
    transportUnsubscribeRef.current = adapter.onTransportStateChange(
      (isAvailable) => {
        setBluetoothStateReceived(true);
        setBluetoothOn(isAvailable);
        if (!isAvailable) {
          setBluetoothError(new Error('Bluetooth is not available'));
        } else {
          setBluetoothError(null);
        }
      },
    );

    return () => {
      scanCleanupRef.current?.();
      transportUnsubscribeRef.current?.();
      adapter.destroy();
      adapterRef.current = null;
    };
  }, [hasBluetoothPermissions, isSearching]);

  // Start device discovery once bluetooth is on
  const handleDeviceFound = useCallback((foundDevice: DiscoveredDevice) => {
    setDiscoveredDevices((prev) => {
      const exists = prev.some((d) => d.id === foundDevice.id);
      if (exists) return prev;
      return [...prev, foundDevice];
    });
  }, []);

  const handleScanError = useCallback((error: Error) => {
    setScanError(error);
    if (isSearchingRef.current) {
      setStep('bluetooth-connection-failed');
    }
  }, []);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter || !bluetoothOn || !isSearching) {
      return;
    }

    adapter.isTransportAvailable().then((available) => {
      if (!available) {
        setBluetoothError(new Error('Bluetooth transport not available'));
        return;
      }

      scanCleanupRef.current = adapter.startDeviceDiscovery(
        handleDeviceFound,
        handleScanError,
      );
    });

    return () => {
      scanCleanupRef.current?.();
      scanCleanupRef.current = null;
    };
  }, [bluetoothOn, isSearching, handleDeviceFound, handleScanError]);

  // Transition to "found" when devices are discovered
  useEffect(() => {
    if (!isSearching || discoveredDevices.length <= 0) {
      return;
    }

    setSelectedDevice(discoveredDevices[0]);
    setStep('found');
  }, [discoveredDevices, isSearching]);

  // Timeout and error handling
  useEffect(() => {
    if (!isSearching) {
      return;
    }

    if (scanError) {
      // Scan errors are already routed to 'bluetooth-connection-failed' in handleScanError.
      return;
    }

    if (bluetoothError) {
      // BT state received as off → show the dedicated "BT off" screen.
      if (bluetoothStateReceived && !bluetoothOn) {
        setStep('bluetooth-off');
      } else {
        setStep('not-found');
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      setStep('not-found');
    }, LEDGER_DISCOVERY_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [bluetoothError, bluetoothOn, bluetoothStateReceived, scanError, isSearching]);

  const resetToSearching = useCallback(() => {
    setDiscoveredDevices([]);
    setSelectedDevice(null);
    setScanError(null);
    setBluetoothError(null);
    setBluetoothStateReceived(false);
    setBluetoothOn(false);
    setStep('searching');
  }, []);

  const selectedDeviceId = selectedDevice?.id ?? discoveredDevices[0]?.id;

  const content = useMemo(() => {
    // ── Device-state error screens (post-connection) ────────────────────────
    if (step === 'ledger-unresponsive') {
      return <LedgerUnresponsive />;
    }

    if (step === 'ledger-locked') {
      return <LedgerIsLocked onRetry={resetToSearching} />;
    }

    if (step === 'eth-app-closed') {
      return <LedgerEthAppClosed onRetry={resetToSearching} />;
    }

    // ── Permission error screens ────────────────────────────────────────────
    if (step === 'bluetooth-access-denied') {
      return <LedgerBluetoothAccessDenied onNotNow={resetToSearching} />;
    }

    if (step === 'location-access-denied') {
      return <LedgerLocationAccessDenied onNotNow={resetToSearching} />;
    }

    if (step === 'nearby-devices-denied') {
      return <LedgerNearbyDevicesDenied onNotNow={resetToSearching} />;
    }

    // ── BT / connection error screens ───────────────────────────────────────
    if (step === 'bluetooth-off') {
      return <LedgerBluetoothOff onNotNow={resetToSearching} />;
    }

    if (step === 'bluetooth-connection-failed') {
      return <LedgerBluetoothConnectionFailed onRetry={resetToSearching} />;
    }

    // ── Existing flow screens ───────────────────────────────────────────────
    if (step === 'accounts' && selectedDevice) {
      return (
        <LedgerDiscoveryAccountSelection
          selectedDevice={selectedDevice}
          onBack={() => setStep('found')}
        />
      );
    }

    if (step === 'not-found') {
      return <LedgerDiscoveryNotFound onRetry={resetToSearching} />;
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
    resetToSearching,
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
