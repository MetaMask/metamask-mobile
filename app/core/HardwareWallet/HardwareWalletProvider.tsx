/* eslint-disable no-console */
/**
 * Hardware Wallet Unified Provider
 *
 * This is the main provider that composes all hardware wallet contexts
 * and provides a unified API for hardware wallet operations.
 *
 * The provider integrates:
 * - Config Context: Wallet type, permissions, device info
 * - State Context: Connection state, error state
 * - Actions Context: Connect, disconnect, ensureDeviceReady, etc.
 *
 * It also includes:
 * - Automatic adapter creation based on wallet type
 * - Device event handling
 * - Error bottom sheet display
 */

import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';

import { HardwareWalletType } from './helpers';
import { ConnectionState, ConnectionStatus } from './connectionState';
import {
  BluetoothPermissionState,
  LocationPermissionState,
  HardwareWalletPermissions,
  DiscoveredDevice,
} from './types';
import {
  HardwareWalletConfigProvider,
  HardwareWalletStateProvider,
  HardwareWalletActionsProvider,
  DeviceSelectionState,
} from './contexts';
import { HardwareWalletBottomSheet } from './components';
import { useHardwareWalletStateManager } from './HardwareWalletStateManager';
import { useDeviceEventHandlers } from './HardwareWalletEventHandlers';
import { createAdapter, requiresBluetooth } from './adapters';
import { parseErrorByType, createHardwareWalletError } from './errors';
import { ErrorCode } from '@metamask/hw-wallet-sdk';

/**
 * Props for the HardwareWalletProvider
 */
export interface HardwareWalletProviderProps {
  children: ReactNode;
  /** Initial permissions state */
  initialPermissions?: HardwareWalletPermissions;
  /** Callback when permissions need to be requested */
  onRequestBluetoothPermissions?: () => Promise<boolean>;
}

/**
 * Default permissions when not provided
 */
const defaultPermissions: HardwareWalletPermissions = {
  bluetooth: BluetoothPermissionState.Unknown,
  location: LocationPermissionState.Unknown,
  allGranted: false,
};

/**
 * Unified Hardware Wallet Provider
 *
 * This provider manages all hardware wallet state and actions,
 * automatically creating the appropriate adapter based on wallet type
 * and handling device events.
 *
 * @example
 * ```tsx
 * <HardwareWalletProvider
 *   onRequestBluetoothPermissions={requestPermissions}
 * >
 *   <App />
 * </HardwareWalletProvider>
 * ```
 */
export const HardwareWalletProvider: React.FC<HardwareWalletProviderProps> = ({
  children,
  initialPermissions = defaultPermissions,
  onRequestBluetoothPermissions,
}) => {
  // State management
  const { state, refs, setters } = useHardwareWalletStateManager();
  const { connectionState, deviceId, walletType, targetWalletType } = state;

  // The effective wallet type (target type during connection, or derived from selected account)
  const effectiveWalletType = targetWalletType ?? walletType;

  // Device selection state for BLE scanning
  const [deviceSelectionState, setDeviceSelectionState] =
    useState<DeviceSelectionState>({
      devices: [],
      selectedDevice: null,
      isScanning: false,
      scanError: null,
    });

  // Track last operation for retry
  const lastOperationRef = useRef<{
    type: 'connect' | 'ensureReady';
    deviceId?: string;
  } | null>(null);

  // Callback to be called after successful connection (from device selection flow)
  const connectionSuccessCallbackRef = useRef<(() => void) | null>(null);

  // Track if the flow has completed successfully (success screen shown)
  // This is independent of the adapter so we can check it even after adapter is cleaned up
  const flowCompleteRef = useRef(false);

  // ========================================================================
  // BLOCKING ensureDeviceReady SUPPORT
  // This ref stores the resolve function for a pending ensureDeviceReady call.
  // When device becomes ready OR user cancels, we call this to unblock the caller.
  // ========================================================================
  const pendingReadyResolveRef = useRef<((ready: boolean) => void) | null>(
    null,
  );

  // ========================================================================
  // AWAITING CONFIRMATION SUPPORT
  // This ref stores the onReject callback for the awaiting confirmation state.
  // When user presses reject in the bottom sheet, we call this.
  // ========================================================================
  const awaitingConfirmationRejectRef = useRef<(() => void) | null>(null);

  // ========================================================================
  // TRANSPORT STATE MONITORING (delegated to adapter)
  // The adapter monitors transport availability (e.g., Bluetooth on/off)
  // and notifies us via onTransportStateChange callback.
  // ========================================================================
  const [isTransportAvailable, setIsTransportAvailable] = useState(false);
  // Track PREVIOUS transport state to detect true → false transitions
  const previousTransportAvailableRef = useRef<boolean | null>(null);

  // Event handlers - must be called before adapter setup
  const { handleDeviceEvent, handleError, clearError, updateConnectionState } =
    useDeviceEventHandlers({
      refs,
      setters,
      walletType: effectiveWalletType,
    });

  // ========================================================================
  // REACTIVE TRANSPORT STATE MONITORING
  // If transport gets disabled during ANY active operation, show error immediately
  // Only triggers on true → false transition (not on initial false state)
  // ========================================================================
  useEffect(() => {
    // Get previous value and update for next render
    const wasAvailable = previousTransportAvailableRef.current;
    previousTransportAvailableRef.current = isTransportAvailable;

    // Only react on TRUE → FALSE transition (transport was on, now it's off)
    // This prevents errors during initialization when we haven't seen true yet
    if (wasAvailable !== true || isTransportAvailable !== false) {
      return;
    }

    console.log(
      '[HardwareWalletProvider] Transport went from available to unavailable',
    );

    // Only react if we're in an active state that requires transport
    const activeStates = [
      ConnectionStatus.Scanning,
      ConnectionStatus.Connecting,
      ConnectionStatus.AwaitingApp,
      ConnectionStatus.AwaitingConfirmation,
      ConnectionStatus.Connected,
    ];

    const isInActiveState = activeStates.includes(connectionState.status);
    const requiresTransport = effectiveWalletType
      ? requiresBluetooth(effectiveWalletType)
      : false;

    // If transport just went off while we're in an active state requiring it, show error
    if (isInActiveState && requiresTransport) {
      console.log(
        '[HardwareWalletProvider] Transport disabled during active operation - showing error',
      );
      const btError = createHardwareWalletError(
        ErrorCode.BluetoothDisabled,
        effectiveWalletType ?? HardwareWalletType.Ledger,
        'Bluetooth was disabled. Please enable Bluetooth in your device settings to continue.',
      );
      updateConnectionState(ConnectionState.error(btError));
    }
  }, [
    isTransportAvailable,
    connectionState.status,
    effectiveWalletType,
    updateConnectionState,
  ]);

  // Create adapter when effective wallet type changes
  // Always creates an adapter - NonHardwareAdapter for non-hardware accounts
  useEffect(() => {
    // Cleanup previous adapter
    if (refs.adapterRef.current) {
      refs.adapterRef.current.disconnect().catch(() => {
        // Ignore disconnect errors during cleanup
      });
      refs.adapterRef.current = null;
    }

    // Reset transport state tracking when adapter changes
    // This prevents false "transport disabled" errors when switching adapters
    previousTransportAvailableRef.current = null;

    // Always create adapter - factory returns NonHardwareAdapter for null/non-hardware
    // This pattern matches the MetaMask Extension where an adapter is always available,
    // allowing consumer code to call ensureDeviceReady() without checking account types
    const adapter = createAdapter(effectiveWalletType, {
      onDisconnect: (error) => {
        if (error) {
          handleError(error);
        } else {
          updateConnectionState(ConnectionState.disconnected());
        }
      },
      onDeviceEvent: handleDeviceEvent,
    });

    refs.adapterRef.current = adapter;

    // Subscribe to transport state changes from the adapter
    // This is how we know if Bluetooth is on/off (adapter handles the monitoring)
    let transportCleanup: (() => void) | undefined;
    if (adapter.onTransportStateChange) {
      transportCleanup = adapter.onTransportStateChange((isAvailable) => {
        console.log(
          '[HardwareWalletProvider] Transport state changed:',
          isAvailable,
        );
        setIsTransportAvailable(isAvailable);
      });
    } else {
      // Adapter doesn't support transport state (e.g., NonHardwareAdapter)
      // Mark as always available
      setIsTransportAvailable(true);
    }

    // Cleanup on unmount
    return () => {
      transportCleanup?.();
      if (refs.adapterRef.current) {
        refs.adapterRef.current.disconnect().catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [
    effectiveWalletType,
    handleDeviceEvent,
    handleError,
    updateConnectionState,
    refs,
  ]);

  // Update permissions state with transport availability
  useEffect(() => {
    setters.setPermissionState((prev) => ({
      ...prev,
      isBluetoothEnabled: isTransportAvailable,
    }));
  }, [isTransportAvailable, setters]);

  // Merge initial permissions
  const permissions = useMemo<HardwareWalletPermissions>(
    () => ({
      ...defaultPermissions,
      ...initialPermissions,
    }),
    [initialPermissions],
  );

  // ========================================================================
  // DEVICE DISCOVERY EFFECT (delegated to adapter)
  // When in Scanning state, use the adapter's device discovery
  // ========================================================================
  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    const adapter = refs.adapterRef.current;

    // Only attempt scanning when in Scanning state and adapter supports discovery
    if (
      connectionState.status === ConnectionStatus.Scanning &&
      adapter?.requiresDeviceDiscovery
    ) {
      console.log('[HardwareWalletProvider] Scanning state entered');

      // Note: We don't check isTransportAvailable here because:
      // 1. The state may be stale (React state may not have updated from adapter callback)
      // 2. The adapter's startDeviceDiscovery handles BLE availability internally
      // 3. If BLE is unavailable, the error callback will transition to error state

      // Clear previous devices and start scanning
      setDeviceSelectionState((prev) => ({
        ...prev,
        devices: [],
        isScanning: true,
        scanError: null,
      }));

      console.log('[HardwareWalletProvider] Starting adapter device discovery');

      // Use adapter's device discovery (adapter handles BLE details internally)
      cleanupFn = adapter.startDeviceDiscovery(
        // onDeviceFound callback
        (device: DiscoveredDevice) => {
          console.log(
            '[HardwareWalletProvider] Device found:',
            device.name,
            device.id,
          );
          setDeviceSelectionState((prev) => {
            // Avoid duplicates
            const exists = prev.devices.some((d) => d.id === device.id);
            if (exists) return prev;
            return {
              ...prev,
              devices: [...prev.devices, device],
            };
          });
        },
        // onError callback
        (error: Error) => {
          console.error(
            '[HardwareWalletProvider] Device discovery error:',
            error,
          );
          // Parse the error to detect specific cases (e.g., permission denied)
          const scanError = parseErrorByType(
            error,
            effectiveWalletType ?? HardwareWalletType.Ledger,
          );
          // Transition to error state so ErrorContent is displayed
          updateConnectionState(ConnectionState.error(scanError));
        },
      );

      return () => {
        console.log('[HardwareWalletProvider] Cleaning up device discovery');
        cleanupFn?.();
        adapter.stopDeviceDiscovery();
      };
    }

    // Reset device selection when leaving Scanning state
    if (connectionState.status !== ConnectionStatus.Scanning) {
      setDeviceSelectionState({
        devices: [],
        selectedDevice: null,
        isScanning: false,
        scanError: null,
      });
    }

    return () => {
      cleanupFn?.();
      if (adapter) {
        adapter.stopDeviceDiscovery();
      }
    };
  }, [
    connectionState.status,
    effectiveWalletType,
    refs,
    updateConnectionState,
  ]);

  /**
   * Open device selection (starts scanning and shows bottom sheet)
   * Called when user selects a wallet type to connect
   *
   * IMPORTANT: Checks Bluetooth state FIRST before proceeding to scanning.
   * If Bluetooth is off, immediately shows an error instead of scanning.
   *
   * @param walletTypeToConnect - The hardware wallet type to connect
   * @param onSuccess - Optional callback called after successful connection
   */
  const openDeviceSelection = useCallback(
    (walletTypeToConnect: HardwareWalletType, onSuccess?: () => void) => {
      console.log(
        '[HardwareWalletProvider] openDeviceSelection called for:',
        walletTypeToConnect,
      );
      // Store the success callback
      connectionSuccessCallbackRef.current = onSuccess ?? null;

      // Set the target wallet type
      setters.setTargetWalletType(walletTypeToConnect);

      // Note: We don't check isTransportAvailable here because:
      // 1. The state may be stale (adapter callback hasn't updated React state yet)
      // 2. The adapter's startDeviceDiscovery will handle BLE availability
      // 3. If BLE is really off, TransportBLE.listen will fail and error callback handles it

      // Proceed to scanning state - let the adapter handle transport availability
      console.log('[HardwareWalletProvider] Transitioning to scanning state');
      updateConnectionState(ConnectionState.scanning());
    },
    [setters, updateConnectionState],
  );

  /**
   * Close device selection (stops scanning and returns to disconnected)
   * Called when user cancels device selection via swipe down or cancel button.
   *
   * Important: This does NOT reset the adapter. The deviceId is preserved so that
   * if the user tries again, we can reconnect to the same device without needing
   * to go through device selection again.
   */
  const closeDeviceSelection = useCallback(() => {
    // Resolve any pending ensureDeviceReady promise with false (cancelled)
    if (pendingReadyResolveRef.current) {
      pendingReadyResolveRef.current(false);
      pendingReadyResolveRef.current = null;
    }
    // Clear target wallet type
    setters.setTargetWalletType(null);
    // Return to disconnected state
    updateConnectionState(ConnectionState.disconnected());
  }, [setters, updateConnectionState]);

  /**
   * Select a device from the discovered devices list
   */
  const selectDevice = useCallback((device: DiscoveredDevice) => {
    setDeviceSelectionState((prev) => ({
      ...prev,
      selectedDevice: device,
    }));
  }, []);

  /**
   * Rescan for BLE devices
   * Clears current device list and restarts scanning
   */
  const rescan = useCallback(() => {
    // Clear devices and restart scanning by re-entering Scanning state
    setDeviceSelectionState({
      devices: [],
      selectedDevice: null,
      isScanning: true,
      scanError: null,
    });
    // The scanning effect will restart due to state change
  }, []);

  /**
   * Track if we're in signing mode (vs device selection mode)
   * This affects how closeSigningModal behaves
   */
  const isSigningRef = useRef(false);

  /**
   * Store the onDeviceReady callback for signing operations
   */
  const onDeviceReadyRef = useRef<(() => Promise<void>) | null>(null);

  /**
   * Open signing modal (for confirmations flow)
   * Connects to the device and shows the signing UI
   * @param walletTypeToSign - The type of wallet
   * @param targetDeviceId - The device ID to connect to
   * @param onDeviceReady - Callback called when device is ready for signing
   */
  const openSigningModal = useCallback(
    async (
      walletTypeToSign: HardwareWalletType,
      targetDeviceId: string,
      onDeviceReady?: () => Promise<void>,
    ): Promise<void> => {
      // Mark that we're in signing mode
      isSigningRef.current = true;

      // Store the callback
      onDeviceReadyRef.current = onDeviceReady ?? null;

      // Set the target wallet type and device ID
      setters.setTargetWalletType(walletTypeToSign);
      setters.setDeviceId(targetDeviceId);

      // Note: We don't check isTransportAvailable here because the adapter's connect
      // method will fail if BLE is unavailable, and the error will be handled properly.
      // This avoids potential race conditions with React state updates.

      // Transition to connecting state (shows bottom sheet)
      updateConnectionState(ConnectionState.connecting());

      try {
        const adapter = refs.adapterRef.current;
        if (!adapter) {
          throw new Error('No adapter available');
        }

        // Connect to the device
        await adapter.connect(targetDeviceId);

        // The adapter will emit device events that update the connection state
        // When we reach AwaitingConfirmation, we'll trigger onDeviceReady
      } catch (error) {
        handleError(error);
      }
    },
    [setters, handleError, updateConnectionState, refs],
  );

  /**
   * Close signing modal
   * Cleans up signing state and hides the bottom sheet
   */
  const closeSigningModal = useCallback(() => {
    // Clear signing mode
    isSigningRef.current = false;
    // Clear the onDeviceReady callback
    onDeviceReadyRef.current = null;
    // Clear target wallet type
    setters.setTargetWalletType(null);
    // Return to disconnected state
    updateConnectionState(ConnectionState.disconnected());
  }, [setters, updateConnectionState]);

  // Trigger onDeviceReady when we reach Connected state during signing
  // This is when the device is connected and the correct app is open
  useEffect(() => {
    if (
      isSigningRef.current &&
      connectionState.status === ConnectionStatus.Connected &&
      onDeviceReadyRef.current
    ) {
      // Transition to AwaitingConfirmation since we're about to request a signature
      updateConnectionState(
        ConnectionState.awaitingConfirmation(connectionState.deviceId, 'sign'),
      );

      // Call the onDeviceReady callback to trigger actual signing
      const callback = onDeviceReadyRef.current;
      onDeviceReadyRef.current = null; // Clear to prevent re-triggering

      callback().catch((error) => {
        console.error('[HardwareWallet] Signing failed:', error);
        handleError(error);
      });
    }
  }, [connectionState, updateConnectionState, handleError]);

  /**
   * Connect to a hardware wallet device
   */
  const connect = useCallback(
    async (targetDeviceId: string): Promise<void> => {
      // Check if already connecting
      if (refs.isConnectingRef.current) {
        return;
      }

      // Note: We don't check isTransportAvailable here because the adapter's connect
      // method will fail if BLE is unavailable, and the error will be handled properly.
      // This avoids potential race conditions with React state updates.

      refs.isConnectingRef.current = true;
      lastOperationRef.current = {
        type: 'ensureReady',
        deviceId: targetDeviceId,
      };

      updateConnectionState(ConnectionState.connecting());

      try {
        const adapter = refs.adapterRef.current;
        if (!adapter) {
          throw new Error('No adapter available');
        }

        await adapter.connect(targetDeviceId);
        setters.setDeviceId(targetDeviceId);

        // If there's a pending ensureDeviceReady promise (from device selection flow),
        // automatically continue with the readiness check
        if (pendingReadyResolveRef.current) {
          console.log(
            '[HardwareWalletProvider] Connect succeeded, continuing readiness check...',
          );

          try {
            const isReady = await adapter.ensureDeviceReady(targetDeviceId);
            console.log(
              '[HardwareWalletProvider] Readiness check result:',
              isReady,
            );

            if (isReady) {
              // Success! Set success state and mark flow complete
              if (adapter.markFlowComplete) {
                adapter.markFlowComplete();
              }
              updateConnectionState(ConnectionState.success(targetDeviceId));
              // The success callback will be triggered when success screen dismisses
              // via onConnectionSuccess in the bottom sheet
            } else {
              // Not ready - show error state (adapter should have emitted events)
              // The pendingReadyResolveRef stays set for retry to use
              console.log(
                '[HardwareWalletProvider] Device not ready after connect',
              );
            }
          } catch (error) {
            console.log(
              '[HardwareWalletProvider] Readiness check failed:',
              error,
            );
            handleError(error);
            // pendingReadyResolveRef stays set for retry
          }
        } else {
          // No pending promise - just set awaiting app state
          updateConnectionState(ConnectionState.awaitingApp(targetDeviceId));
        }
      } catch (error) {
        handleError(error);
      } finally {
        refs.isConnectingRef.current = false;
      }
    },
    [refs, setters, handleError, updateConnectionState],
  );

  /**
   * Disconnect from the current device
   */
  const disconnect = useCallback(async (): Promise<void> => {
    // Cancel any abort controller
    if (refs.abortControllerRef.current) {
      refs.abortControllerRef.current.abort();
      refs.abortControllerRef.current = null;
    }

    try {
      const adapter = refs.adapterRef.current;
      if (adapter) {
        await adapter.disconnect();
      }
    } catch (error) {
      // Log but don't throw - we want to reset state regardless
      if (__DEV__) {
        console.warn('[HardwareWallet] Disconnect error:', error);
      }
    }

    updateConnectionState(ConnectionState.disconnected());
    setters.setDeviceId(null);
    refs.isConnectingRef.current = false;
  }, [refs, setters, updateConnectionState]);

  /**
   * Ensure the device is ready for operations.
   *
   * This is a BLOCKING function that returns a Promise which only resolves when:
   * 1. Device is fully ready (returns true)
   * 2. User cancels the flow (returns false)
   *
   * The function handles ALL device readiness checks:
   * - Bluetooth enabled
   * - Permissions granted
   * - Device connected
   * - Ethereum app open
   * - Device unlocked
   *
   * If any check fails, appropriate UI is shown and we wait for the user
   * to fix the issue (or cancel).
   *
   * Usage:
   * ```
   * const isReady = await ensureDeviceReady();
   * if (isReady) {
   *   // Device is guaranteed ready - proceed with operation
   *   await doHardwareWalletOperation();
   * }
   * // If not ready, user cancelled - nothing more to do
   * ```
   */
  const ensureDeviceReady = useCallback(
    async (targetDeviceId?: string): Promise<boolean> => {
      console.log(
        '[HardwareWalletProvider] ensureDeviceReady called with deviceId:',
        targetDeviceId,
      );

      // If there's already a pending check, abandon it (don't resolve it)
      // The old promise will simply never resolve - this is intentional.
      // Resolving to `false` would cause the old component to act on stale data
      // (e.g., calling navigation.goBack() from an unmounted component).
      // By leaving it unresolved, the old component's cleanup handles it naturally.
      if (pendingReadyResolveRef.current) {
        console.log(
          '[HardwareWalletProvider] Abandoning previous pending readiness check (not resolving)',
        );
        pendingReadyResolveRef.current = null;
      }

      // Reset flow complete flag so errors can be shown for this new flow
      flowCompleteRef.current = false;

      // Wallet type is derived from current account or previously set via setTargetWalletType
      const targetWalletType = effectiveWalletType ?? HardwareWalletType.Ledger;

      // If targetDeviceId is explicitly provided, use it
      // Otherwise, always start fresh with device selection (don't use stale deviceId from state)
      const shouldStartFresh = targetDeviceId === undefined;
      const deviceIdToUse = shouldStartFresh ? undefined : targetDeviceId;

      // Ensure we have the correct adapter type BEFORE any checks
      // The existing adapter might be NonHardwareAdapter if effectiveWalletType was null
      const existingAdapter = refs.adapterRef.current;
      const needsNewAdapter =
        !existingAdapter || existingAdapter.walletType !== targetWalletType;

      const adapter = needsNewAdapter
        ? (() => {
            console.log(
              '[HardwareWalletProvider] Creating adapter for:',
              targetWalletType,
              '(existing was:',
              existingAdapter?.walletType,
              ')',
            );
            const newAdapter = createAdapter(targetWalletType, {
              onDisconnect: (error) => {
                if (error) {
                  handleError(error);
                } else {
                  updateConnectionState(ConnectionState.disconnected());
                }
              },
              onDeviceEvent: handleDeviceEvent,
            });
            refs.adapterRef.current = newAdapter;
            return newAdapter;
          })()
        : existingAdapter;

      // Reset adapter flow state so errors can be shown
      if (adapter.resetFlowState) {
        adapter.resetFlowState();
      }

      // Track operation for retry BEFORE any checks
      lastOperationRef.current = {
        type: 'ensureReady',
        deviceId: deviceIdToUse,
      };

      // Check Bluetooth availability BEFORE proceeding (await it!)
      console.log(
        '[HardwareWalletProvider] Checking Bluetooth availability...',
      );
      const isBluetoothOn = await adapter.isTransportAvailable();
      console.log(
        '[HardwareWalletProvider] Bluetooth available:',
        isBluetoothOn,
      );

      if (!isBluetoothOn) {
        console.log(
          '[HardwareWalletProvider] Bluetooth is OFF - showing error immediately',
        );
        const btError = createHardwareWalletError(
          ErrorCode.BluetoothDisabled,
          targetWalletType,
        );
        updateConnectionState(ConnectionState.error(btError));

        // Return a promise that waits for retry or cancel
        // Don't resolve with false - that would trigger "user cancelled" in caller
        return new Promise<boolean>((resolve) => {
          pendingReadyResolveRef.current = resolve;
          connectionSuccessCallbackRef.current = () => {
            if (pendingReadyResolveRef.current === resolve) {
              pendingReadyResolveRef.current = null;
              resolve(true);
            }
          };
        });
      }

      // Bluetooth is ON - proceed with the normal flow
      return new Promise<boolean>((resolve) => {
        pendingReadyResolveRef.current = resolve;

        // Set up success callback - called when success screen is dismissed
        connectionSuccessCallbackRef.current = () => {
          console.log(
            '[HardwareWalletProvider] Success callback - resolving with true',
          );
          if (pendingReadyResolveRef.current === resolve) {
            pendingReadyResolveRef.current = null;
            resolve(true);
          }
        };

        // If no device ID, show device selection (scanning state)
        if (!deviceIdToUse) {
          console.log(
            '[HardwareWalletProvider] No device ID - starting device selection',
          );
          updateConnectionState(ConnectionState.scanning());
          return;
        }

        // Have device ID - proceed with connection
        console.log(
          '[HardwareWalletProvider] Have device ID, checking readiness...',
        );

        updateConnectionState(ConnectionState.connecting());

        // Do the readiness check
        (async () => {
          try {
            refs.abortControllerRef.current = new AbortController();

            console.log(
              '[HardwareWalletProvider] Calling adapter.ensureDeviceReady...',
            );
            const isReady = await adapter.ensureDeviceReady(deviceIdToUse);
            console.log(
              '[HardwareWalletProvider] adapter.ensureDeviceReady returned:',
              isReady,
            );

            if (isReady) {
              // Success! Set success state
              adapter.markFlowComplete();
              updateConnectionState(ConnectionState.success(deviceIdToUse));
              // Promise will be resolved when success screen dismisses (via callback)
            }
            // If not ready, adapter should have set error state
            // Promise stays pending for retry or cancel
          } catch (error) {
            console.log(
              '[HardwareWalletProvider] ensureDeviceReady error:',
              error,
            );
            handleError(error);
            // Promise stays pending for retry or cancel
          } finally {
            refs.abortControllerRef.current = null;
          }
        })();
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      deviceId,
      setters,
      refs,
      handleError,
      handleDeviceEvent,
      effectiveWalletType,
      updateConnectionState,
    ],
  );

  /**
   * Show hardware wallet error in bottom sheet.
   *
   * PUBLIC API - Always shows the error, no suppression.
   * Use this for errors that occur after ensureDeviceReady() succeeds,
   * such as signing errors, transaction failures, etc.
   *
   * The wallet type is auto-derived from the current account, matching
   * the simplified API pattern from ensureDeviceReady().
   *
   * @example
   * ```typescript
   * try {
   *   await signTransaction();
   * } catch (error) {
   *   if (!isUserCancellation(error)) {
   *     showHardwareWalletError(error);
   *   }
   * }
   * ```
   */
  const showHardwareWalletError = useCallback(
    (error: unknown) => {
      console.log('[HardwareWalletProvider] showHardwareWalletError:', error);
      // Always show the error - this is the public API for post-connection errors
      handleError(error);
    },
    [handleError],
  );

  /**
   * Clear error state
   */
  const clearErrorState = useCallback(() => {
    clearError();
  }, [clearError]);

  /**
   * Retry the last failed operation
   *
   * Important: We must set the UI state to Connecting BEFORE starting the operation,
   * otherwise the user sees nothing happening (the error gets cleared but no new
   * UI appears until events come back from the adapter).
   *
   * For the blocking ensureDeviceReady pattern:
   * - If there's a pending resolve ref from a failed ensureDeviceReady, we preserve it
   * - When retry succeeds, we resolve the pending promise with `true`
   * - This ensures the original caller gets unblocked with success
   */
  const retry = useCallback(async (): Promise<void> => {
    // Reset adapter flow state so errors can be shown again
    const adapter = refs.adapterRef.current;
    if (adapter?.resetFlowState) {
      adapter.resetFlowState();
    }

    // Clear error state
    clearErrorState();

    const lastOp = lastOperationRef.current;
    if (!lastOp) {
      return;
    }

    // Check Bluetooth before retrying - fail fast with correct error
    if (adapter) {
      const isBluetoothOn = await adapter.isTransportAvailable();
      if (!isBluetoothOn) {
        console.log('[HardwareWalletProvider] Retry: Bluetooth is still OFF');
        const btError = createHardwareWalletError(
          ErrorCode.BluetoothDisabled,
          effectiveWalletType ?? HardwareWalletType.Ledger,
        );
        updateConnectionState(ConnectionState.error(btError));
        return;
      }
    }

    // For ensureReady operations, handle both with and without deviceId
    if (lastOp.type === 'ensureReady') {
      if (lastOp.deviceId && adapter) {
        // Have device ID → retry connection to that device (skip device selection)
        updateConnectionState(ConnectionState.connecting());
        try {
          const isReady = await adapter.ensureDeviceReady(lastOp.deviceId);
          if (isReady) {
            // Success! Transition to Success state to show success screen
            if (adapter.markFlowComplete) {
              adapter.markFlowComplete();
            }
            updateConnectionState(ConnectionState.success(lastOp.deviceId));
            // The promise will be resolved when success screen dismisses
            // via connectionSuccessCallbackRef (already set up by ensureDeviceReady)
            return;
          }
          // Not ready (shouldn't happen if no error) - stay in error state for retry
        } catch (error) {
          // Error during retry - show error, user can retry again
          handleError(error);
        }
      } else {
        // No device ID → restart from device selection (scanning)
        console.log(
          '[HardwareWalletProvider] Retry: No deviceId - restarting device selection',
        );
        updateConnectionState(ConnectionState.scanning());
      }
      return;
    }

    // For connect operations, use the existing flow
    switch (lastOp.type) {
      case 'connect':
        if (lastOp.deviceId) {
          await connect(lastOp.deviceId);
        }
        break;
      default:
        break;
    }
  }, [
    connect,
    clearErrorState,
    handleError,
    updateConnectionState,
    refs,
    effectiveWalletType,
  ]);

  /**
   * Request Bluetooth permissions
   */
  const requestBluetoothPermissions =
    useCallback(async (): Promise<boolean> => {
      if (onRequestBluetoothPermissions) {
        return onRequestBluetoothPermissions();
      }
      return false;
    }, [onRequestBluetoothPermissions]);

  /**
   * Reset the flow state to allow errors to be shown again.
   * Should be called before starting new operations that may fail
   * (e.g., unlocking accounts after initial connection).
   */
  const resetFlowState = useCallback(() => {
    const adapter = refs.adapterRef.current;
    if (adapter?.resetFlowState) {
      adapter.resetFlowState();
    }
  }, [refs]);

  /**
   * Show the "awaiting confirmation" bottom sheet.
   * Call this after ensureDeviceReady returns true, before sending
   * a signing request to the device. Shows UI prompting user to
   * confirm on their hardware wallet.
   *
   * This is a STANDALONE state - not part of ensureDeviceReady flow.
   * The bottom sheet shows "Confirm on your device" with a spinner and reject button.
   *
   * @param operationType - The type of operation ('transaction' or 'message')
   * @param onReject - Callback when user presses the reject button
   */
  const showAwaitingConfirmation = useCallback(
    (operationType: 'transaction' | 'message', onReject?: () => void) => {
      console.log(
        '[HardwareWalletProvider] showAwaitingConfirmation:',
        operationType,
      );
      // Store the onReject callback
      awaitingConfirmationRejectRef.current = onReject ?? null;

      // Use the current device ID from state
      const currentDeviceId = deviceId ?? 'unknown';

      // Transition to AwaitingConfirmation state
      updateConnectionState(
        ConnectionState.awaitingConfirmation(currentDeviceId, operationType),
      );
    },
    [deviceId, updateConnectionState],
  );

  /**
   * Hide the "awaiting confirmation" bottom sheet.
   * Call this after the signing operation completes (success or error).
   */
  const hideAwaitingConfirmation = useCallback(() => {
    console.log('[HardwareWalletProvider] hideAwaitingConfirmation');
    // Clear the onReject callback
    awaitingConfirmationRejectRef.current = null;

    // Return to disconnected state (hides the bottom sheet)
    updateConnectionState(ConnectionState.disconnected());
  }, [updateConnectionState]);

  /**
   * Handle cancel from awaiting confirmation bottom sheet.
   * Called when user presses the reject/cancel button.
   */
  const handleAwaitingConfirmationCancel = useCallback(() => {
    console.log('[HardwareWalletProvider] handleAwaitingConfirmationCancel');
    // Call the stored onReject callback if present
    const onReject = awaitingConfirmationRejectRef.current;
    if (onReject) {
      onReject();
    }
    // Then hide the bottom sheet
    hideAwaitingConfirmation();
  }, [hideAwaitingConfirmation]);

  // Determine if current account is a hardware wallet
  const isHardwareWalletAccount = walletType !== null;

  return (
    <HardwareWalletConfigProvider
      isHardwareWalletAccount={isHardwareWalletAccount}
      walletType={effectiveWalletType}
      deviceId={deviceId}
      isBluetoothEnabled={isTransportAvailable}
      permissions={permissions}
    >
      <HardwareWalletStateProvider
        connectionState={connectionState}
        deviceSelection={deviceSelectionState}
      >
        <HardwareWalletActionsProvider
          onOpenDeviceSelection={openDeviceSelection}
          onCloseDeviceSelection={closeDeviceSelection}
          onOpenSigningModal={openSigningModal}
          onCloseSigningModal={closeSigningModal}
          onConnect={connect}
          onDisconnect={disconnect}
          onEnsureDeviceReady={ensureDeviceReady}
          onSetTargetWalletType={setters.setTargetWalletType}
          onShowHardwareWalletError={showHardwareWalletError}
          onClearError={clearErrorState}
          onRetry={retry}
          onRequestBluetoothPermissions={requestBluetoothPermissions}
          onSelectDevice={selectDevice}
          onRescan={rescan}
          onResetFlowState={resetFlowState}
          onShowAwaitingConfirmation={showAwaitingConfirmation}
          onHideAwaitingConfirmation={hideAwaitingConfirmation}
        >
          {children}
          {/* Unified Hardware Wallet Bottom Sheet - handles ALL states */}
          <HardwareWalletBottomSheet
            onCancel={closeSigningModal}
            onClose={closeSigningModal}
            onAwaitingConfirmationCancel={handleAwaitingConfirmationCancel}
            onConnectionSuccess={() => {
              // Mark flow as complete to suppress any error events
              flowCompleteRef.current = true;
              if (refs.adapterRef.current) {
                refs.adapterRef.current.markFlowComplete();
              }

              // Resolve the promise first
              const callback = connectionSuccessCallbackRef.current;
              if (callback) {
                connectionSuccessCallbackRef.current = null;
                callback();
              }

              // Then hide the sheet by transitioning to disconnected
              updateConnectionState(ConnectionState.disconnected());
            }}
          />
        </HardwareWalletActionsProvider>
      </HardwareWalletStateProvider>
    </HardwareWalletConfigProvider>
  );
};

export default HardwareWalletProvider;
