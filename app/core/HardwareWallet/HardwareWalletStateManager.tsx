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

/** Core state managed by the hardware wallet state manager. */
interface HardwareWalletManagedState {
  /** Current connection state (discriminated union keyed on status). */
  connectionState: HardwareWalletConnectionState;
  /** Device ID of the connected hardware wallet, or null if none. */
  deviceId: string | null;
  /** Wallet type derived from the currently selected account, or null for non-HW accounts. */
  walletType: HardwareWalletType | null;
  /** Explicit wallet type override for new connections before an account exists. */
  targetWalletType: HardwareWalletType | null;
}

/** Mutable refs shared across the hardware wallet system. */
export interface HardwareWalletRefs {
  /** Reference to the active hardware wallet adapter instance. */
  adapterRef: React.MutableRefObject<HardwareWalletAdapter | null>;
  /** Guard flag to prevent concurrent connection attempts. */
  isConnectingRef: React.MutableRefObject<boolean>;
  /** AbortController for cancelling in-flight connection operations. */
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

/** State setter functions exposed by the state manager. */
export interface HardwareWalletStateSetters {
  setConnectionState: React.Dispatch<
    React.SetStateAction<HardwareWalletConnectionState>
  >;
  setDeviceId: React.Dispatch<React.SetStateAction<string | null>>;
  setTargetWalletType: React.Dispatch<
    React.SetStateAction<HardwareWalletType | null>
  >;
}

/** Return value of the {@link useHardwareWalletStateManager} hook. */
interface HardwareWalletStateManagerResult {
  /** Current hardware wallet state (connection, device, wallet type). */
  state: HardwareWalletManagedState;
  /** Mutable refs for adapter, connection guard, and abort controller. */
  refs: HardwareWalletRefs;
  /** State setter functions for updating managed state. */
  setters: HardwareWalletStateSetters;
  /** Resets all state, refs, and aborts any in-flight operations. */
  resetState: () => void;
}

/**
 * Hook that manages all hardware wallet state: connection status, device ID,
 * wallet type detection, mutable refs, and state reset.
 *
 * Derives `walletType` from the currently selected account via Redux.
 * Provides `targetWalletType` for flows where no HW account exists yet
 * (e.g., "Add Hardware Wallet").
 */
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
      adapterRef.current = null;

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
