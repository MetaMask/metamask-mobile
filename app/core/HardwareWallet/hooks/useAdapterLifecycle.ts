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
    (targetType: HardwareWalletType) =>
      createAdapter(targetType, {
        onDisconnect: (error) => {
          if (error) {
            handleError(error);
          } else {
            updateConnectionState({ status: ConnectionStatus.Disconnected });
          }
        },
        onDeviceEvent: handleDeviceEvent,
      }),
    [handleDeviceEvent, handleError, updateConnectionState],
  );

  const initializeAdapter = useCallback(
    (adapter: ReturnType<typeof createAdapter>): void => {
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;

      adapterRef.current = adapter;

      if (adapter.onTransportStateChange) {
        transportCleanupRef.current = adapter.onTransportStateChange(
          (isAvailable) => {
            DevLogger.log(
              '[HardwareWallet] Transport state changed:',
              isAvailable,
            );
            setIsTransportAvailable(isAvailable);
          },
        );
      } else {
        setIsTransportAvailable(true);
      }
    },
    [adapterRef],
  );

  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.disconnect().catch(() => {
        // Ignore disconnect errors during cleanup
      });
      adapterRef.current = null;
    }

    previousTransportAvailableRef.current = null;

    const adapter = walletType
      ? createAdapterWithCallbacks(walletType)
      : createAdapter(null, {
          // eslint-disable-next-line no-empty-function
          onDisconnect: () => {},
          onDeviceEvent: handleDeviceEvent,
        });

    initializeAdapter(adapter);

    return () => {
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;
      if (adapterRef.current) {
        adapterRef.current.disconnect().catch(() => {
          // Ignore cleanup errors
        });
        adapterRef.current = null;
      }
    };
  }, [
    walletType,
    handleDeviceEvent,
    createAdapterWithCallbacks,
    initializeAdapter,
    adapterRef,
  ]);

  return {
    isTransportAvailable,
    previousTransportAvailableRef,
    createAdapterWithCallbacks,
    initializeAdapter,
  };
};
