import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { createAdapter } from '../../../../core/HardwareWallet/adapters/factory';
import useBluetoothPermissions from '../../../hooks/useBluetoothPermissions';
import { BluetoothPermissionErrors } from '../../../../core/Ledger/ledgerErrors';
import { transition } from './DiscoveryFlow.machine';
import { getConfigForWalletType } from './configs';
import type { DiscoveryStep, MachineEvent, DeviceUIConfig } from './DiscoveryFlow.types';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';
import SearchingForDevice from '../SearchingForDevice';
import DiscoveryNotFoundScreen from './screens/DiscoveryNotFound';
import DiscoveryFoundScreen from './screens/DiscoveryFound';
import DiscoverySelectDeviceScreen from './screens/DiscoverySelectDevice';
import DiscoveryAccountSelectionScreen from './screens/DiscoveryAccountSelection';

interface RouteParams {
  walletType: HardwareWalletType;
}

const DiscoveryFlow: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { walletType } = (route.params as RouteParams) ?? {
    walletType: HardwareWalletType.Ledger,
  };
  const { hasBluetoothPermissions, bluetoothPermissionError } =
    useBluetoothPermissions();

  const config = useMemo(() => getConfigForWalletType(walletType), [walletType]);

  const [step, setStep] = useState<DiscoveryStep>('searching');
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>(
    [],
  );
  const [selectedDevice, setSelectedDevice] =
    useState<DiscoveredDevice | null>(null);
  const [isSelectingDevice, setIsSelectingDevice] = useState(false);

  const stepRef = useRef<DiscoveryStep>(step);
  stepRef.current = step;

  const send = useCallback(
    (event: MachineEvent) => {
      const next = transition(stepRef.current, event, config);
      setStep(next);
    },
    [config],
  );

  const adapterRef = useRef<ReturnType<typeof createAdapter> | null>(null);
  const scanCleanupRef = useRef<(() => void) | null>(null);
  const transportUnsubscribeRef = useRef<(() => void) | null>(null);
  const [bluetoothOn, setBluetoothOn] = useState(false);
  const [bluetoothStateReceived, setBluetoothStateReceived] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Route permission errors through the state machine
  useEffect(() => {
    if (!bluetoothPermissionError) return;
    switch (bluetoothPermissionError) {
      case BluetoothPermissionErrors.BluetoothAccessBlocked:
        send({ type: 'PERMISSIONS_DENIED', errorCode: ErrorCode.PermissionBluetoothDenied });
        break;
      case BluetoothPermissionErrors.LocationAccessBlocked:
        send({ type: 'PERMISSIONS_DENIED', errorCode: ErrorCode.PermissionLocationDenied });
        break;
      case BluetoothPermissionErrors.NearbyDevicesAccessBlocked:
        send({ type: 'PERMISSIONS_DENIED', errorCode: ErrorCode.PermissionNearbyDevicesDenied });
        break;
    }
  }, [bluetoothPermissionError, send]);

  // Create adapter when searching begins
  useEffect(() => {
    if (!hasBluetoothPermissions || stepRef.current !== 'searching') {
      return;
    }

    const adapter = createAdapter(walletType, {
      onDisconnect: () => undefined,
      onDeviceEvent: () => undefined,
    });
    adapterRef.current = adapter;

    if (adapter.onTransportStateChange) {
      transportUnsubscribeRef.current = adapter.onTransportStateChange(
        (isAvailable) => {
          setBluetoothStateReceived(true);
          setBluetoothOn(isAvailable);
          if (!isAvailable) {
            send({ type: 'TRANSPORT_UNAVAILABLE' });
          }
        },
      );
    }

    return () => {
      scanCleanupRef.current?.();
      transportUnsubscribeRef.current?.();
      adapter.destroy();
      adapterRef.current = null;
    };
  }, [hasBluetoothPermissions, send, walletType]);

  // Start device discovery once bluetooth is on
  const handleDeviceFound = useCallback((foundDevice: DiscoveredDevice) => {
    setDiscoveredDevices((prev) => {
      if (prev.some((d) => d.id === foundDevice.id)) return prev;
      return [...prev, foundDevice];
    });
  }, []);

  const handleScanError = useCallback(
    (error: Error) => {
      send({ type: 'SCAN_ERROR', error });
    },
    [send],
  );

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter || !bluetoothOn || stepRef.current !== 'searching') {
      return;
    }

    adapter.isTransportAvailable().then((available) => {
      if (!available) {
        send({ type: 'TRANSPORT_UNAVAILABLE' });
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
  }, [bluetoothOn, send, handleDeviceFound, handleScanError]);

  // Transition to found when devices discovered
  useEffect(() => {
    if (stepRef.current !== 'searching' || discoveredDevices.length <= 0) {
      return;
    }
    setSelectedDevice(discoveredDevices[0]);
    send({ type: 'DEVICE_FOUND', device: discoveredDevices[0] });
  }, [discoveredDevices, send]);

  // Timeout
  useEffect(() => {
    if (stepRef.current !== 'searching' || config.discoveryTimeoutMs <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      send({ type: 'TIMEOUT' });
    }, config.discoveryTimeoutMs);

    return () => clearTimeout(timeoutId);
  }, [config.discoveryTimeoutMs, send]);

  const resetToSearching = useCallback(() => {
    setDiscoveredDevices([]);
    setSelectedDevice(null);
    setBluetoothStateReceived(false);
    setBluetoothOn(false);
    send({ type: 'RETRY' });
  }, [send]);

  const selectedDeviceId = selectedDevice?.id ?? discoveredDevices[0]?.id;

  const content = useMemo(() => {
    // Error screens
    if (
      step === 'device-locked' ||
      step === 'device-unresponsive' ||
      step === 'app-not-open' ||
      step === 'transport-unavailable' ||
      step === 'transport-connection-failed' ||
      step === 'permission-denied'
    ) {
      return (
        <DiscoveryNotFoundScreen
          config={config}
          onRetry={resetToSearching}
        />
      );
    }

    // Account selection
    if (step === 'accounts' && selectedDevice) {
      return (
        <DiscoveryAccountSelectionScreen
          config={config}
          selectedDevice={selectedDevice}
          onBack={() => send({ type: 'BACK' })}
        />
      );
    }

    // Not found
    if (step === 'not-found') {
      return (
        <DiscoveryNotFoundScreen
          config={config}
          onRetry={resetToSearching}
        />
      );
    }

    // Found
    if (step === 'found' && selectedDevice) {
      return (
        <>
          <DiscoveryFoundScreen
            config={config}
            deviceName={selectedDevice.name}
            onOpenSelectDevice={() => setIsSelectingDevice(true)}
            onConnect={() =>
              send({ type: 'OPEN_ACCOUNTS', device: selectedDevice })
            }
          />
          {isSelectingDevice ? (
            <DiscoverySelectDeviceScreen
              devices={discoveredDevices}
              selectedDeviceId={selectedDeviceId ?? ''}
              onSelectDevice={setSelectedDevice}
              onClose={() => setIsSelectingDevice(false)}
              onSave={() => {
                setIsSelectingDevice(false);
                send({ type: 'OPEN_ACCOUNTS', device: selectedDevice });
              }}
              config={config}
            />
          ) : null}
        </>
      );
    }

    return <SearchingForDevice />;
  }, [
    config,
    discoveredDevices,
    isSelectingDevice,
    resetToSearching,
    selectedDevice,
    selectedDeviceId,
    send,
    step,
  ]);

  return content;
};

export default DiscoveryFlow;
