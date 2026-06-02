import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ConnectionStatus,
  ErrorCode,
  HardwareWalletType,
} from '@metamask/hw-wallet-sdk';
import { createAdapter } from '../../../../core/HardwareWallet/adapters/factory';
import { useHardwareWallet } from '../../../../core/HardwareWallet';
import useBluetoothPermissions from '../../../hooks/useBluetoothPermissions';
import { BluetoothPermissionErrors } from '../../../../core/Ledger/ledgerErrors';
import { transition } from './DiscoveryFlow.machine';
import { getConfigForWalletType } from './configs';
import PAGINATION_OPERATIONS from '../../../../constants/pagination';
import {
  DiscoveryStep,
  HardwareWalletDiscoveryEventType,
  type MachineEvent,
} from './DiscoveryFlow.machine.types';
import type { AccountInfo, DeviceUIConfig } from './DiscoveryFlow.types';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';
import SearchingForDevice from '../SearchingForDevice';
import DiscoveryNotFoundScreen from './screens/DiscoveryNotFound';
import DiscoveryFoundScreen from './screens/DiscoveryFound';
import DiscoverySelectDeviceScreen from './screens/DiscoverySelectDevice';
import DiscoveryAccountSelectionScreen from './screens/DiscoveryAccountSelection';
import DiscoveryErrorScreenRouter, {
  isDiscoveryErrorStep,
  shouldShowGenericProviderError,
} from './screens/errors/DiscoveryErrorScreenRouter';

interface RouteParams {
  walletType: HardwareWalletType;
  initialStep?: DiscoveryStep.Searching | DiscoveryStep.Accounts;
}

const QR_WALLET_DEVICE: DiscoveredDevice = {
  id: 'qr-wallet',
  name: 'QR Wallet',
};

const useIsBleWallet = (walletType: HardwareWalletType) =>
  walletType === HardwareWalletType.Ledger;

const resolveProviderErrorStep = (
  errorCode: ErrorCode,
  config: Pick<DeviceUIConfig, 'errorToStepMap'>,
): DiscoveryStep | null => {
  if (config.errorToStepMap[errorCode]) {
    return config.errorToStepMap[errorCode] ?? null;
  }

  switch (errorCode) {
    case ErrorCode.PermissionBluetoothDenied:
    case ErrorCode.PermissionLocationDenied:
    case ErrorCode.PermissionNearbyDevicesDenied:
    case ErrorCode.PermissionCameraDenied:
      return DiscoveryStep.PermissionDenied;
    default:
      return null;
  }
};

const DiscoveryFlow: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { connectionState, setTargetWalletType } = useHardwareWallet();
  const { walletType, initialStep } = (route.params as RouteParams) ?? {
    walletType: HardwareWalletType.Ledger,
  };

  const isBle = useIsBleWallet(walletType);
  const blePermissions = useBluetoothPermissions();

  const config = useMemo(
    () => getConfigForWalletType(walletType),
    [walletType],
  );

  const [step, setStep] = useState<DiscoveryStep>(
    initialStep ?? DiscoveryStep.Searching,
  );
  const [discoveredDevices, setDiscoveredDevices] = useState<
    DiscoveredDevice[]
  >([]);
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(
    initialStep === DiscoveryStep.Accounts ? QR_WALLET_DEVICE : null,
  );
  const [isSelectingDevice, setIsSelectingDevice] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(
    initialStep === DiscoveryStep.Accounts,
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
  const transportWasAvailableRef = useRef(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    setTargetWalletType(walletType);
  }, [setTargetWalletType, walletType]);

  // === Permission handling ===

  // BLE wallets: use useBluetoothPermissions hook for specific error types
  useEffect(() => {
    if (!isBle) return;
    if (!blePermissions.bluetoothPermissionError) return;
    switch (blePermissions.bluetoothPermissionError) {
      case BluetoothPermissionErrors.BluetoothAccessBlocked:
        send({
          type: HardwareWalletDiscoveryEventType.PermissionsDenied,
          errorCode: ErrorCode.PermissionBluetoothDenied,
        });
        break;
      case BluetoothPermissionErrors.LocationAccessBlocked:
        send({
          type: HardwareWalletDiscoveryEventType.PermissionsDenied,
          errorCode: ErrorCode.PermissionLocationDenied,
        });
        break;
      case BluetoothPermissionErrors.NearbyDevicesAccessBlocked:
        send({
          type: HardwareWalletDiscoveryEventType.PermissionsDenied,
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
    if (isBle || step !== 'searching') return;

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
          type: HardwareWalletDiscoveryEventType.PermissionsDenied,
          errorCode: ErrorCode.PermissionCameraDenied,
        });
      }
    });

    return () => {
      adapter.disconnect().catch(() => undefined);
      adapterRef.current = null;
    };
  }, [isBle, send, step, walletType]);

  // === Adapter creation + transport monitoring (BLE only) ===

  useEffect(() => {
    // Keep the BLE adapter alive after discovery so Connect can reuse the same
    // transport while accounts are being preloaded.
    if (!isBle || !permissionsGranted) {
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
          if (isAvailable) {
            transportWasAvailableRef.current = true;
            if (stepRef.current === DiscoveryStep.TransportUnavailable) {
              setDiscoveredDevices([]);
              setSelectedDevice(null);
              setPreloadedAccounts([]);
              setIsConnecting(false);
              send({ type: HardwareWalletDiscoveryEventType.Retry });
            }
          } else {
            send({
              type: HardwareWalletDiscoveryEventType.TransportUnavailable,
            });
          }
        },
      );
    }

    return () => {
      scanCleanupRef.current?.();
      transportUnsubscribeRef.current?.();
      transportUnsubscribeRef.current = null;
      adapter.disconnect().catch(() => undefined);
      adapterRef.current = null;
    };
  }, [isBle, permissionsGranted, send, walletType]);

  // === Non-BLE: skip discovery, go to accounts directly ===

  useEffect(() => {
    if (isBle || !permissionsGranted || step !== DiscoveryStep.Searching)
      return;

    const adapter = adapterRef.current;
    if (!adapter) return;

    if (!adapter.requiresDeviceDiscovery) {
      setSelectedDevice(QR_WALLET_DEVICE);
      send({
        type: HardwareWalletDiscoveryEventType.OpenAccounts,
        device: QR_WALLET_DEVICE,
      });
    }
  }, [isBle, permissionsGranted, send, step]);

  // === Device discovery (BLE) ===

  const handleDeviceFound = useCallback((foundDevice: DiscoveredDevice) => {
    setDiscoveredDevices((prev) => {
      if (prev.some((d) => d.id === foundDevice.id)) return prev;
      return [...prev, foundDevice];
    });
  }, []);

  const handleScanError = useCallback(
    (error: Error) => {
      send({ type: HardwareWalletDiscoveryEventType.ScanError, error });
    },
    [send],
  );

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter || !transportReady || step !== DiscoveryStep.Searching) {
      return;
    }

    adapter.isTransportAvailable().then((available) => {
      if (!available) {
        send({ type: HardwareWalletDiscoveryEventType.TransportUnavailable });
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
  }, [transportReady, send, handleDeviceFound, handleScanError, step]);

  // Transition to found when devices discovered
  useEffect(() => {
    if (step !== DiscoveryStep.Searching || discoveredDevices.length <= 0) {
      return;
    }
    setSelectedDevice(discoveredDevices[0]);
    send({
      type: HardwareWalletDiscoveryEventType.DeviceFound,
      device: discoveredDevices[0],
    });
  }, [discoveredDevices, send, step]);

  // Timeout
  useEffect(() => {
    if (step !== DiscoveryStep.Searching || config.discoveryTimeoutMs <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      send({ type: HardwareWalletDiscoveryEventType.Timeout });
    }, config.discoveryTimeoutMs);

    return () => clearTimeout(timeoutId);
  }, [config.discoveryTimeoutMs, send, step]);

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
        const result = await adapter.ensureDeviceReady(targetDevice.id);
        if (result.ready) {
          const accounts = await config.accountManager.getAccounts(
            String(PAGINATION_OPERATIONS.GET_FIRST_PAGE),
          );
          setPreloadedAccounts(accounts);
          transportUnsubscribeRef.current?.();
          transportUnsubscribeRef.current = null;
          await adapter.disconnect().catch(() => undefined);
          if (adapterRef.current === adapter) {
            adapterRef.current = null;
          }
          send({
            type: HardwareWalletDiscoveryEventType.OpenAccounts,
            device: targetDevice,
          });
        } else {
          send({
            type: HardwareWalletDiscoveryEventType.ConnectError,
            errorCode: result.errorCode,
          });
        }
      } catch (error) {
        const errorCode =
          (error as { errorCode?: ErrorCode }).errorCode ?? ErrorCode.Unknown;
        send({
          type: HardwareWalletDiscoveryEventType.ConnectError,
          errorCode,
        });
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
    transportWasAvailableRef.current = false;
    setPermissionsGranted(
      isBle ? blePermissions.hasBluetoothPermissions : false,
    );
    setPreloadedAccounts([]);
    setIsConnecting(false);
    send({ type: HardwareWalletDiscoveryEventType.Retry });
  }, [blePermissions.hasBluetoothPermissions, isBle, send]);

  const handleGenericErrorContinue = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const activeDevice =
    selectedDevice ??
    discoveredDevices[0] ??
    (step === DiscoveryStep.Accounts ? QR_WALLET_DEVICE : null);
  const selectedDeviceId = selectedDevice?.id ?? discoveredDevices[0]?.id;
  const providerErrorStep = useMemo(() => {
    if (connectionState.status !== ConnectionStatus.ErrorState) {
      return null;
    }

    return resolveProviderErrorStep(connectionState.error.code, config);
  }, [config, connectionState]);

  const content = useMemo(() => {
    const renderedStep = providerErrorStep ?? step;
    const showGenericProviderError = shouldShowGenericProviderError(
      connectionState.status,
      providerErrorStep,
    );

    if (showGenericProviderError || isDiscoveryErrorStep(renderedStep)) {
      return (
        <DiscoveryErrorScreenRouter
          step={renderedStep}
          showGenericProviderError={showGenericProviderError}
          walletType={walletType}
          onRetry={resetToSearching}
          onNotNow={resetToSearching}
          onContinue={handleGenericErrorContinue}
        />
      );
    }

    if (renderedStep === DiscoveryStep.PermissionDenied) {
      return (
        <DiscoveryNotFoundScreen config={config} onRetry={resetToSearching} />
      );
    }

    if (renderedStep === DiscoveryStep.Accounts && activeDevice) {
      return (
        <DiscoveryAccountSelectionScreen
          config={config}
          selectedDevice={activeDevice}
          initialAccounts={preloadedAccounts}
          onBack={() => send({ type: HardwareWalletDiscoveryEventType.Back })}
        />
      );
    }

    if (renderedStep === DiscoveryStep.NotFound) {
      return (
        <DiscoveryNotFoundScreen config={config} onRetry={resetToSearching} />
      );
    }

    if (
      (renderedStep === DiscoveryStep.Found || isConnecting) &&
      activeDevice
    ) {
      return (
        <>
          <DiscoveryFoundScreen
            config={config}
            deviceName={activeDevice.name}
            deviceCount={discoveredDevices.length}
            isConnecting={isConnecting}
            onOpenSelectDevice={() => setIsSelectingDevice(true)}
            onConnect={() => handleConnect(activeDevice)}
          />
          {isSelectingDevice ? (
            <DiscoverySelectDeviceScreen
              devices={discoveredDevices}
              selectedDeviceId={selectedDeviceId ?? ''}
              onSelectDevice={setSelectedDevice}
              onClose={() => setIsSelectingDevice(false)}
              onSave={() => {
                setIsSelectingDevice(false);
                handleConnect(selectedDevice ?? activeDevice);
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
    connectionState.status,
    providerErrorStep,
    discoveredDevices,
    handleConnect,
    handleGenericErrorContinue,
    isConnecting,
    isSelectingDevice,
    preloadedAccounts,
    resetToSearching,
    activeDevice,
    selectedDevice,
    selectedDeviceId,
    send,
    step,
    walletType,
  ]);

  return content;
};

export default DiscoveryFlow;
