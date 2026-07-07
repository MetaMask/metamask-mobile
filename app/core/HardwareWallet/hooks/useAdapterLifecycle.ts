import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
  DeviceEventPayload,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';

import { createAdapter } from '../adapters';
import { HardwareWalletAdapter } from '../types';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import { isDmkEnabled } from '../../Ledger/dmk';

interface UseAdapterLifecycleOptions {
  walletType: HardwareWalletType | null;
  adapterRef: React.MutableRefObject<HardwareWalletAdapter | null>;
  handleDeviceEvent: (payload: DeviceEventPayload) => void;
  handleError: (error: unknown) => void;
  updateConnectionState: (state: HardwareWalletConnectionState) => void;
}

interface UseAdapterLifecycleResult {
  isTransportAvailable: boolean;
  previousTransportAvailableRef: React.MutableRefObject<boolean | null>;
  createAdapterWithCallbacks: (
    targetType: HardwareWalletType,
  ) => HardwareWalletAdapter;
  initializeAdapter: (adapter: HardwareWalletAdapter) => void;
}

/**
 * Manages the hardware wallet adapter lifecycle: creates the appropriate adapter
 * when the effective wallet type changes, subscribes to transport state changes,
 * and cleans up on unmount.
 *
 * The provider always keeps an adapter instance — for non-hardware accounts,
 * a NonHardwareAdapter (null-object pattern) is created so consumers never
 * need to null-check. NonHardwareAdapter methods are no-ops or return "ready"
 * immediately.
 */
export const useAdapterLifecycle = ({
  walletType,
  adapterRef,
  handleDeviceEvent,
  handleError,
  updateConnectionState,
}: UseAdapterLifecycleOptions): UseAdapterLifecycleResult => {
  const [isTransportAvailable, setIsTransportAvailable] = useState(false);
  const previousTransportAvailableRef = useRef<boolean | null>(null);
  const transportCleanupRef = useRef<(() => void) | null>(null);

  const createAdapterWithCallbacks = useCallback(
    (targetType: HardwareWalletType) => {
      const enableDmk = isDmkEnabled();
      return createAdapter(
        targetType,
        {
          onDisconnect: (error) => {
            if (error) {
              handleError(error);
            } else {
              updateConnectionState({ status: ConnectionStatus.Disconnected });
            }
          },
          onDeviceEvent: handleDeviceEvent,
        },
        enableDmk,
      );
    },
    [handleDeviceEvent, handleError, updateConnectionState],
  );

  const initializeAdapter = useCallback(
    (adapter: HardwareWalletAdapter): void => {
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;

      adapterRef.current = adapter;

      transportCleanupRef.current = adapter.onTransportStateChange(
        (isAvailable) => {
          DevLogger.log(
            '[HardwareWallet] Transport state changed:',
            isAvailable,
          );
          setIsTransportAvailable(isAvailable);
        },
      );
    },
    // Stable ref (adapterRef) — not needed as a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.destroy();
      adapterRef.current = null;
    }

    previousTransportAvailableRef.current = null;

    const enableDmk = isDmkEnabled();

    const adapter = walletType
      ? createAdapterWithCallbacks(walletType)
      : createAdapter(
          null,
          {
            // eslint-disable-next-line no-empty-function
            onDisconnect: () => {},
            onDeviceEvent: handleDeviceEvent,
          },
          enableDmk,
        );

    initializeAdapter(adapter);

    return () => {
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
    };
    // Stable ref (adapterRef) — not needed as a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    walletType,
    handleDeviceEvent,
    createAdapterWithCallbacks,
    initializeAdapter,
  ]);

  return {
    isTransportAvailable,
    previousTransportAvailableRef,
    createAdapterWithCallbacks,
    initializeAdapter,
  };
};
