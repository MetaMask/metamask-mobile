import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { createAdapter } from '../../../../core/HardwareWallet/adapters/factory';
import useBluetoothPermissions from '../../../hooks/useBluetoothPermissions';
import { BluetoothPermissionErrors } from '../../../../core/Ledger/ledgerErrors';
import { transition } from './DiscoveryFlow.machine';
import { getConfigForWalletType } from './configs';
import PAGINATION_OPERATIONS from '../../../../constants/pagination';
import type {
  DiscoveryStep,
  MachineEvent,
  AccountInfo,
} from './DiscoveryFlow.types';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';
import SearchingForDevice from '../SearchingForDevice';
import DiscoveryNotFoundScreen from './screens/DiscoveryNotFound';
import DiscoveryFoundScreen from './screens/DiscoveryFound';
import DiscoverySelectDeviceScreen from './screens/DiscoverySelectDevice';
import DiscoveryAccountSelectionScreen from './screens/DiscoveryAccountSelection';

interface RouteParams {
  walletType: HardwareWalletType;
  initialStep?: 'searching' | 'accounts';
}

const useIsBleWallet = (walletType: HardwareWalletType) =>
  walletType === HardwareWalletType.Ledger;

const DiscoveryFlow: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { walletType, initialStep } = (route.params as RouteParams) ?? {
    walletType: HardwareWalletType.Ledger,
  };

  const isBle = useIsBleWallet(walletType);
  const blePermissions = useBluetoothPermissions();

  const config = useMemo(
    () => getConfigForWalletType(walletType),
    [walletType],
  );

  const [step, setStep] = useState<DiscoveryStep>(initialStep ?? 'searching');
  const [discoveredDevices, setDiscoveredDevices] = useState<
    DiscoveredDevice[]
  >([]);
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(
    initialStep === 'accounts' ? { id: 'qr-wallet', name: 'QR Wallet' } : null,
  );
  const [isSelectingDevice, setIsSelectingDevice] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(
    initialStep === 'accounts',
  );

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
  const [transportReady, setTransportReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [preloadedAccounts, setPreloadedAccounts] = useState<AccountInfo[]>([]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // === Permission handling ===

  // BLE wallets: use useBluetoothPermissions hook for specific error types
  useEffect(() => {
    if (!isBle) return;
    if (!blePermissions.bluetoothPermissionError) return;
    switch (blePermissions.bluetoothPermissionError) {
      case BluetoothPermissionErrors.BluetoothAccessBlocked:
        send({
          type: 'PERMISSIONS_DENIED',
          errorCode: ErrorCode.PermissionBluetoothDenied,
        });
        break;
      case BluetoothPermissionErrors.LocationAccessBlocked:
        send({
          type: 'PERMISSIONS_DENIED',
          errorCode: ErrorCode.PermissionLocationDenied,
        });
        break;
      case BluetoothPermissionErrors.NearbyDevicesAccessBlocked:
        send({
          type: 'PERMISSIONS_DENIED',
          errorCode: ErrorCode.PermissionNearbyDevicesDenied,
        });
        break;
    }
  }, [blePermissions.bluetoothPermissionError, isBle, send]);

  useEffect(() => {
    if (!isBle) return;
    if (blePermissions.hasBluetoothPermissions) {
      setPermissionsGranted(true);
    }
  }, [blePermissions.hasBluetoothPermissions, isBle]);

  // Non-BLE wallets: use adapter's ensurePermissions
  useEffect(() => {
    if (isBle || stepRef.current !== 'searching') return;

    const adapter = createAdapter(walletType, {
      onDisconnect: () => undefined,
      onDeviceEvent: () => undefined,
    });
    adapterRef.current = adapter;

    adapter.ensurePermissions().then((granted) => {
      if (granted) {
        setPermissionsGranted(true);
      } else {
        send({
          type: 'PERMISSIONS_DENIED',
          errorCode: ErrorCode.PermissionCameraDenied,
        });
      }
    });

    return () => {
      adapter.destroy();
      adapterRef.current = null;
    };
  }, [isBle, send, walletType]);

  // === Adapter creation + transport monitoring (BLE only) ===

  useEffect(() => {
    if (!isBle || !permissionsGranted || stepRef.current !== 'searching') {
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
          setTransportReady(isAvailable);
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
  }, [isBle, permissionsGranted, send, walletType]);

  // === Non-BLE: skip discovery, go to accounts directly ===

  useEffect(() => {
    if (isBle || !permissionsGranted || stepRef.current !== 'searching') return;

    const adapter = adapterRef.current;
    if (!adapter) return;

    if (!adapter.requiresDeviceDiscovery) {
      send({
        type: 'OPEN_ACCOUNTS',
        device: { id: 'qr-wallet', name: 'QR Wallet' },
      });
    }
  }, [isBle, permissionsGranted, send]);

  // === Device discovery (BLE) ===

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
    if (!adapter || !transportReady || stepRef.current !== 'searching') {
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
  }, [transportReady, send, handleDeviceFound, handleScanError]);

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

  // === BLE connect + pre-load accounts (keeps Found screen visible) ===

  const handleConnect = useCallback(
    async (targetDevice: DiscoveredDevice) => {
      setIsConnecting(true);

      // Stop any ongoing scan before connecting
      scanCleanupRef.current?.();
      scanCleanupRef.current = null;

      const adapter = adapterRef.current;
      if (!adapter) {
        setIsConnecting(false);
        return;
      }

      try {
        await adapter.connect(targetDevice.id);
        const ready = await adapter.ensureDeviceReady(targetDevice.id);
        if (ready) {
          const accounts = await config.accountManager.getAccounts(
            String(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
          );
          setPreloadedAccounts(accounts);
          send({ type: 'OPEN_ACCOUNTS', device: targetDevice });
        }
      } catch (error) {
        const errorCode =
          (error as { errorCode?: ErrorCode }).errorCode ?? ErrorCode.Unknown;
        send({ type: 'CONNECT_ERROR', errorCode });
      } finally {
        setIsConnecting(false);
      }
    },
    [config, send],
  );

  const resetToSearching = useCallback(() => {
    setDiscoveredDevices([]);
    setSelectedDevice(null);
    setTransportReady(false);
    setPermissionsGranted(false);
    setPreloadedAccounts([]);
    setIsConnecting(false);
    send({ type: 'RETRY' });
  }, [send]);

  const selectedDeviceId = selectedDevice?.id ?? discoveredDevices[0]?.id;

  const content = useMemo(() => {
    if (
      step === 'device-locked' ||
      step === 'device-unresponsive' ||
      step === 'app-not-open' ||
      step === 'transport-unavailable' ||
      step === 'transport-connection-failed' ||
      step === 'permission-denied'
    ) {
      return (
        <DiscoveryNotFoundScreen config={config} onRetry={resetToSearching} />
      );
    }

    if (step === 'accounts' && selectedDevice) {
      return (
        <DiscoveryAccountSelectionScreen
          config={config}
          selectedDevice={selectedDevice}
          initialAccounts={preloadedAccounts}
          onBack={() => send({ type: 'BACK' })}
        />
      );
    }

    if (step === 'not-found') {
      return (
        <DiscoveryNotFoundScreen config={config} onRetry={resetToSearching} />
      );
    }

    if (step === 'found' && selectedDevice) {
      return (
        <>
          <DiscoveryFoundScreen
            config={config}
            deviceName={selectedDevice.name}
            isConnecting={isConnecting}
            onOpenSelectDevice={() => setIsSelectingDevice(true)}
            onConnect={() => handleConnect(selectedDevice)}
          />
          {isSelectingDevice ? (
            <DiscoverySelectDeviceScreen
              devices={discoveredDevices}
              selectedDeviceId={selectedDeviceId ?? ''}
              onSelectDevice={setSelectedDevice}
              onClose={() => setIsSelectingDevice(false)}
              onSave={() => {
                setIsSelectingDevice(false);
                handleConnect(selectedDevice);
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
    handleConnect,
    isConnecting,
    isSelectingDevice,
    preloadedAccounts,
    resetToSearching,
    selectedDevice,
    selectedDeviceId,
    send,
    step,
  ]);

  return content;
};

export default DiscoveryFlow;
