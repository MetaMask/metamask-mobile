import { useRef, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../selectors/accountsController';
import { getHardwareWalletTypeForAddress } from './helpers';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';
import { HardwareWalletAdapter } from './types';

/**
 * State managed by the hardware wallet state manager
 */
export interface HardwareWalletManagedState {
  /** Current connection state machine state */
  connectionState: HardwareWalletConnectionState;
  /** ID of the currently connected or target device */
  deviceId: string | null;
  /** Type of hardware wallet for current account (derived from selected account) */
  walletType: HardwareWalletType | null;
  /** Target wallet type for new connections (set when opening device selection) */
  targetWalletType: HardwareWalletType | null;
}

/**
 * Refs for stable callbacks and adapter management
 */
export interface HardwareWalletRefs {
  /** Reference to the current hardware wallet adapter */
  adapterRef: React.MutableRefObject<HardwareWalletAdapter | null>;
  /** Flag to prevent concurrent connection attempts */
  isConnectingRef: React.MutableRefObject<boolean>;
  /** AbortController for cancellable operations */
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

/**
 * State setters for updating managed state
 */
export interface HardwareWalletStateSetters {
  setConnectionState: React.Dispatch<
    React.SetStateAction<HardwareWalletConnectionState>
  >;
  setDeviceId: React.Dispatch<React.SetStateAction<string | null>>;
  setTargetWalletType: React.Dispatch<
    React.SetStateAction<HardwareWalletType | null>
  >;
}

/**
 * Return type of the useHardwareWalletStateManager hook
 */
export interface HardwareWalletStateManagerResult {
  state: HardwareWalletManagedState;
  refs: HardwareWalletRefs;
  setters: HardwareWalletStateSetters;
  /** Reset all state to initial values */
  resetState: () => void;
}

/**
 * Hook to manage hardware wallet state.
 *
 * This hook centralizes all hardware wallet state management including:
 * - Connection state machine
 * - Device ID tracking
 * - Wallet type detection from selected account
 *
 * It also provides refs for stable callbacks and an adapter reference.
 */
export const useHardwareWalletStateManager =
  (): HardwareWalletStateManagerResult => {
    // Connection state
    const [connectionState, setConnectionState] =
      useState<HardwareWalletConnectionState>({
        status: ConnectionStatus.Disconnected,
      });

    // Device tracking
    const [deviceId, setDeviceId] = useState<string | null>(null);

    // Target wallet type (for new connections before account is created)
    const [targetWalletType, setTargetWalletType] =
      useState<HardwareWalletType | null>(null);

    // Refs for stable callbacks and adapter management
    const adapterRef = useRef<HardwareWalletAdapter | null>(null);
    const isConnectingRef = useRef<boolean>(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Derive wallet type from selected account
    const selectedAccount = useSelector(selectSelectedInternalAccount);

    const walletType = useMemo((): HardwareWalletType | null => {
      if (!selectedAccount?.address) {
        return null;
      }
      return getHardwareWalletTypeForAddress(selectedAccount.address) ?? null;
    }, [selectedAccount?.address]);

    // Reset function
    const resetState = useCallback(() => {
      setConnectionState({ status: ConnectionStatus.Disconnected });
      setDeviceId(null);
      setTargetWalletType(null);
      isConnectingRef.current = false;

      // Abort any ongoing operations
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    }, []);

    // Memoize state object to prevent unnecessary re-renders
    const state = useMemo<HardwareWalletManagedState>(
      () => ({
        connectionState,
        deviceId,
        walletType,
        targetWalletType,
      }),
      [connectionState, deviceId, walletType, targetWalletType],
    );

    // Refs object (stable reference)
    const refs = useMemo<HardwareWalletRefs>(
      () => ({
        adapterRef,
        isConnectingRef,
        abortControllerRef,
      }),
      [],
    );

    // Setters object (stable reference)
    const setters = useMemo<HardwareWalletStateSetters>(
      () => ({
        setConnectionState,
        setDeviceId,
        setTargetWalletType,
      }),
      [],
    );

    return {
      state,
      refs,
      setters,
      resetState,
    };
  };

export default useHardwareWalletStateManager;
