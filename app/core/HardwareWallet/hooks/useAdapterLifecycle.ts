import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
  DeviceEventPayload,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';

import { createAdapter } from '../adapters';
import { HardwareWalletAdapter } from '../types';
import { useEventCallback } from '../../../hooks/useEventCallback';
import Engine from '../../Engine';

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
 *
 * The parent-supplied callbacks (`handleDeviceEvent`, `handleError`,
 * `updateConnectionState`) are wrapped in `useEventCallback` so the adapter's
 * stored subscriptions always invoke the latest version without causing the
 * wallet-type effect to re-run on parent re-renders.
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

  const stableHandleDeviceEvent = useEventCallback(handleDeviceEvent);
  const stableHandleError = useEventCallback(handleError);
  const stableUpdateConnectionState = useEventCallback(updateConnectionState);

  const createAdapterWithCallbacks = useCallback(
    (targetType: HardwareWalletType) =>
      createAdapter(
        targetType,
        {
          onDisconnect: (error) => {
            if (error) {
              stableHandleError(error);
            } else {
              stableUpdateConnectionState({
                status: ConnectionStatus.Disconnected,
              });
            }
          },
          onDeviceEvent: stableHandleDeviceEvent,
        },
        Engine.controllerMessenger,
      ),
    [stableHandleDeviceEvent, stableHandleError, stableUpdateConnectionState],
  );

  const initializeAdapter = useCallback(
    (adapter: HardwareWalletAdapter): void => {
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;

      adapterRef.current = adapter;

      transportCleanupRef.current = adapter.onTransportStateChange(
        (isAvailable) => {
          console.log('[HardwareWallet] Transport state changed:', isAvailable);
          setIsTransportAvailable(isAvailable);
        },
      );
    },
    [adapterRef],
  );

  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.destroy();
      adapterRef.current = null;
    }

    previousTransportAvailableRef.current = null;

    const adapter = walletType
      ? createAdapterWithCallbacks(walletType)
      : createAdapter(
          null,
          {
            onDisconnect: () => undefined,
            onDeviceEvent: stableHandleDeviceEvent,
          },
          Engine.controllerMessenger,
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
  }, [
    walletType,
    createAdapterWithCallbacks,
    initializeAdapter,
    stableHandleDeviceEvent,
    adapterRef,
  ]);

  return {
    isTransportAvailable,
    previousTransportAvailableRef,
    createAdapterWithCallbacks,
    initializeAdapter,
  };
};
