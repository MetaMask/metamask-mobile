import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
  DeviceEventPayload,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';

import { createAdapter } from '../adapters';
import { HardwareWalletAdapter } from '../types';


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

  const handleDeviceEventRef = useRef(handleDeviceEvent);
  handleDeviceEventRef.current = handleDeviceEvent;
  const handleErrorRef = useRef(handleError);
  handleErrorRef.current = handleError;
  const updateConnectionStateRef = useRef(updateConnectionState);
  updateConnectionStateRef.current = updateConnectionState;

  const createAdapterWithCallbacks = useCallback(
    (targetType: HardwareWalletType) =>
      createAdapter(targetType, {
        onDisconnect: (error) => {
          if (error) {
            handleErrorRef.current(error);
          } else {
            updateConnectionStateRef.current({ status: ConnectionStatus.Disconnected });
          }
        },
        onDeviceEvent: (payload) => handleDeviceEventRef.current(payload),
      }),
    [],
  );

  const initializeAdapter = useCallback(
    (adapter: ReturnType<typeof createAdapter>): void => {
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;

      adapterRef.current = adapter;

      if (adapter.onTransportStateChange) {
        transportCleanupRef.current = adapter.onTransportStateChange(
          (isAvailable) => {
            console.log(
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
    [],
  );

  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.destroy?.();
      adapterRef.current = null;
    }

    previousTransportAvailableRef.current = null;

    const adapter = walletType
      ? createAdapterWithCallbacks(walletType)
      : createAdapter(null, {
          onDisconnect: () => {},
          onDeviceEvent: (payload) => handleDeviceEventRef.current(payload),
        });

    initializeAdapter(adapter);

    return () => {
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;
      if (adapterRef.current) {
        adapterRef.current.destroy?.();
        adapterRef.current = null;
      }
    };
  }, [
    walletType,
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
