import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';

import {
  DiscoveredDevice,
  DeviceSelectionState,
  HardwareWalletAdapter,
} from '../types';
import { parseErrorByType } from '../errors';
import DevLogger from '../../SDKConnect/utils/DevLogger';

const INITIAL_DEVICE_SELECTION: DeviceSelectionState = {
  devices: [],
  selectedDevice: null,
  isScanning: false,
  scanError: null,
};

interface UseDeviceDiscoveryOptions {
  adapterRef: React.MutableRefObject<HardwareWalletAdapter | null>;
  walletType: HardwareWalletType | null;
  connectionState: HardwareWalletConnectionState;
  updateConnectionState: (state: HardwareWalletConnectionState) => void;
}

interface UseDeviceDiscoveryResult {
  deviceSelection: DeviceSelectionState;
  selectDevice: (device: DiscoveredDevice) => void;
  rescan: () => void;
}

/**
 * Manages device scanning, the discovered-device list, and
 * selection. Automatically starts and stops discovery when the connection
 * status transitions to/from Scanning.
 */
export const useDeviceDiscovery = ({
  adapterRef,
  walletType,
  connectionState,
  updateConnectionState,
}: UseDeviceDiscoveryOptions): UseDeviceDiscoveryResult => {
  const [deviceSelection, setDeviceSelection] = useState<DeviceSelectionState>(
    INITIAL_DEVICE_SELECTION,
  );

  const discoveryCleanupRef = useRef<(() => void) | null>(null);

  const stopDiscovery = useCallback(() => {
    discoveryCleanupRef.current?.();
    discoveryCleanupRef.current = null;
  }, []);

  const startDiscovery = useCallback(() => {
    const adapter = adapterRef.current;

    stopDiscovery();

    setDeviceSelection((prev) => ({
      ...prev,
      devices: [],
      selectedDevice: null,
      isScanning: !!adapter?.requiresDeviceDiscovery,
      scanError: null,
    }));

    if (!adapter?.requiresDeviceDiscovery) return;

    DevLogger.log('[HardwareWallet] Starting adapter device discovery');

    const cleanupFn = adapter.startDeviceDiscovery(
      (device: DiscoveredDevice) => {
        DevLogger.log('[HardwareWallet] Device found:', device.name, device.id);
        setDeviceSelection((prev) => {
          const exists = prev.devices.some((d) => d.id === device.id);
          if (exists) return prev;
          return {
            ...prev,
            devices: [...prev.devices, device],
          };
        });
      },
      (error: Error) => {
        DevLogger.log('[HardwareWallet] Device discovery error:', error);
        const scanError = parseErrorByType(
          error,
          walletType ?? adapter.walletType,
        );
        updateConnectionState({
          status: ConnectionStatus.ErrorState,
          error: scanError,
        });
      },
    );

    discoveryCleanupRef.current = () => {
      cleanupFn?.();
      adapter.stopDeviceDiscovery();
    };
  }, [adapterRef, walletType, updateConnectionState, stopDiscovery]);

  useEffect(() => {
    if (connectionState.status === ConnectionStatus.Scanning) {
      DevLogger.log('[HardwareWallet] Scanning state entered');
      startDiscovery();
      return () => stopDiscovery();
    }

    stopDiscovery();
    setDeviceSelection(INITIAL_DEVICE_SELECTION);
    return undefined;
  }, [connectionState.status, startDiscovery, stopDiscovery]);

  const selectDevice = useCallback((device: DiscoveredDevice) => {
    setDeviceSelection((prev) => ({
      ...prev,
      selectedDevice: device,
    }));
  }, []);

  const rescan = useCallback(() => {
    startDiscovery();
  }, [startDiscovery]);

  return {
    deviceSelection,
    selectDevice,
    rescan,
  };
};
