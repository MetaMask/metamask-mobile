import { useRef, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';

import { selectSelectedInternalAccount } from '../../selectors/accountsController';
import { getHardwareWalletTypeForAddress } from './helpers';
import { HardwareWalletAdapter } from './types';

export interface HardwareWalletManagedState {
  connectionState: HardwareWalletConnectionState;
  deviceId: string | null;
  walletType: HardwareWalletType | null;
  targetWalletType: HardwareWalletType | null;
}

export interface HardwareWalletRefs {
  adapterRef: React.MutableRefObject<HardwareWalletAdapter | null>;
  isConnectingRef: React.MutableRefObject<boolean>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

export interface HardwareWalletStateSetters {
  setConnectionState: React.Dispatch<
    React.SetStateAction<HardwareWalletConnectionState>
  >;
  setDeviceId: React.Dispatch<React.SetStateAction<string | null>>;
  setTargetWalletType: React.Dispatch<
    React.SetStateAction<HardwareWalletType | null>
  >;
}

export interface HardwareWalletStateManagerResult {
  state: HardwareWalletManagedState;
  refs: HardwareWalletRefs;
  setters: HardwareWalletStateSetters;
  resetState: () => void;
}

export const useHardwareWalletStateManager =
  (): HardwareWalletStateManagerResult => {
    const [connectionState, setConnectionState] =
      useState<HardwareWalletConnectionState>({
        status: ConnectionStatus.Disconnected,
      });

    const [deviceId, setDeviceId] = useState<string | null>(null);

    // Target wallet type (for new connections before account is created)
    const [targetWalletType, setTargetWalletType] =
      useState<HardwareWalletType | null>(null);

    const adapterRef = useRef<HardwareWalletAdapter | null>(null);
    const isConnectingRef = useRef<boolean>(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const selectedAccount = useSelector(selectSelectedInternalAccount);

    // Why are we exposing targetWalletType if we can derive it below depending on wether
    // we have an address or not?
    const walletType = useMemo((): HardwareWalletType | null => {
      if (!selectedAccount?.address) {
        return null;
      }
      return getHardwareWalletTypeForAddress(selectedAccount.address) ?? null;
    }, [selectedAccount?.address]);

    const state = useMemo<HardwareWalletManagedState>(
      () => ({
        connectionState,
        deviceId,
        walletType,
        targetWalletType,
      }),
      [connectionState, deviceId, walletType, targetWalletType],
    );

    const refs = useMemo<HardwareWalletRefs>(
      () => ({
        adapterRef,
        isConnectingRef,
        abortControllerRef,
      }),
      [],
    );

    const setters = useMemo<HardwareWalletStateSetters>(
      () => ({
        setConnectionState,
        setDeviceId,
        setTargetWalletType,
      }),
      [],
    );

    const resetState = useCallback(() => {
      setConnectionState({ status: ConnectionStatus.Disconnected });
      setDeviceId(null);
      setTargetWalletType(null);
      isConnectingRef.current = false;

      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    }, []);

    return {
      state,
      refs,
      setters,
      resetState,
    };
  };

export default useHardwareWalletStateManager;
