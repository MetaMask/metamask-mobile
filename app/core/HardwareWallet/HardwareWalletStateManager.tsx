import { useRef, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../selectors/accountsController';
import { HardwareWalletType, getHardwareWalletTypeForAddress } from './helpers';
import {
  ConnectionState,
  HardwareWalletConnectionState,
} from './connectionState';
import {
  BluetoothPermissionState,
  LocationPermissionState,
  HardwareWalletAdapter,
} from './types';

/**
 * Permission state for hardware wallet connections
 */
export interface HardwareWalletPermissionState {
  bluetooth: BluetoothPermissionState;
  location: LocationPermissionState;
}

/**
 * State managed by the hardware wallet state manager
 */
export interface HardwareWalletManagedState {
  /** Current connection state machine state */
  connectionState: HardwareWalletConnectionState;
  /** ID of the currently connected or target device */
  deviceId: string | null;
  /** Current permission states */
  permissionState: HardwareWalletPermissionState;
  /** Type of hardware wallet for current account (derived from selected account) */
  walletType: HardwareWalletType | null;
  /** Target wallet type for new connections (set when opening device selection) */
  targetWalletType: HardwareWalletType | null;
  /** Whether the current account is a hardware wallet account */
  isHardwareWalletAccount: boolean;
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
  setPermissionState: React.Dispatch<
    React.SetStateAction<HardwareWalletPermissionState>
  >;
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
 * Default permission state
 */
const DEFAULT_PERMISSION_STATE: HardwareWalletPermissionState = {
  bluetooth: BluetoothPermissionState.Unknown,
  location: LocationPermissionState.Unknown,
};

/**
 * Hook to manage hardware wallet state.
 *
 * This hook centralizes all hardware wallet state management including:
 * - Connection state machine
 * - Device ID tracking
 * - Permission states
 * - Wallet type detection from selected account
 *
 * It also provides refs for stable callbacks and an adapter reference.
 *
 * @example
 * ```typescript
 * const { state, refs, setters, resetState } = useHardwareWalletStateManager();
 *
 * // Access current state
 * if (state.isHardwareWalletAccount) {
 *   console.log('Hardware wallet type:', state.walletType);
 * }
 *
 * // Update state
 * setters.setConnectionState(ConnectionState.connecting());
 *
 * // Use refs in callbacks
 * const connect = useCallback(async () => {
 *   if (refs.isConnectingRef.current) return;
 *   refs.isConnectingRef.current = true;
 *   // ...
 * }, []);
 * ```
 */
export const useHardwareWalletStateManager =
  (): HardwareWalletStateManagerResult => {
    // Connection state
    const [connectionState, setConnectionState] =
      useState<HardwareWalletConnectionState>(ConnectionState.disconnected());

    // Device tracking
    const [deviceId, setDeviceId] = useState<string | null>(null);

    // Permission state
    const [permissionState, setPermissionState] =
      useState<HardwareWalletPermissionState>(DEFAULT_PERMISSION_STATE);

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

    const isHardwareWalletAccount = walletType !== null;

    // Reset function
    const resetState = useCallback(() => {
      setConnectionState(ConnectionState.disconnected());
      setDeviceId(null);
      setPermissionState(DEFAULT_PERMISSION_STATE);
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
        permissionState,
        walletType,
        targetWalletType,
        isHardwareWalletAccount,
      }),
      [
        connectionState,
        deviceId,
        permissionState,
        walletType,
        targetWalletType,
        isHardwareWalletAccount,
      ],
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
        setPermissionState,
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
