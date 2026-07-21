import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
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
import { useSelector } from 'react-redux';
import { selectRemoteFeatureFlags } from '../../../selectors/featureFlagController';

interface UseAdapterLifecycleOptions {
  walletType: HardwareWalletType | null;
  /**
   * Device id of the currently-connected hardware wallet, or null. Used to
   * keep the adapter alive across selected-account fluctuations during a
   * signing flow (the Redux-derived `walletType` can transiently null while
   * a device is still connected — tearing the adapter down then would kill an
   * in-flight operation).
   */
  deviceId: string | null;
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
 * Parent callbacks are wrapped in `useEffectEvent` so adapter subscriptions
 * always invoke the latest handlers without making `createAdapterWithCallbacks`
 * identity change (and thus without tearing down an in-flight adapter).
 */
export const useAdapterLifecycle = ({
  walletType,
  deviceId,
  adapterRef,
  handleDeviceEvent,
  handleError,
  updateConnectionState,
}: UseAdapterLifecycleOptions): UseAdapterLifecycleResult => {
  const [isTransportAvailable, setIsTransportAvailable] = useState(false);
  const previousTransportAvailableRef = useRef<boolean | null>(null);
  const transportCleanupRef = useRef<(() => void) | null>(null);

  // DMK flag, read live from feature-flag state. Held in a ref so the adapter
  // callbacks stay stable (no spurious re-creation on flag change); the value
  // is read fresh at adapter-creation time.
  const dmkFlags = useSelector(selectRemoteFeatureFlags);
  const dmkFlagsRef = useRef(dmkFlags);
  dmkFlagsRef.current = dmkFlags;

  const onDeviceEvent = useEffectEvent(handleDeviceEvent);
  const onError = useEffectEvent(handleError);
  const onUpdateConnectionState = useEffectEvent(updateConnectionState);

  const createAdapterWithCallbacks = useCallback(
    (targetType: HardwareWalletType) => {
      const enableDmk = isDmkEnabled(dmkFlagsRef.current);
      return createAdapter(
        targetType,
        {
          onDisconnect: (error) => {
            if (error) {
              onError(error);
            } else {
              onUpdateConnectionState({
                status: ConnectionStatus.Disconnected,
              });
            }
          },
          onDeviceEvent,
        },
        enableDmk,
      );
    },
    // Effect Events are intentionally non-reactive / identity-stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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

  // Adapter create/recreate. The body decides whether to KEEP the existing
  // adapter or tear it down + build a new one; the cleanup is a no-op so that a
  // dep-change re-run never destroys an adapter out from under an in-flight
  // operation (React runs the previous run's cleanup BEFORE the new body, so a
  // destroying cleanup here would always win — the keep logic could never
  // engage). Final destruction on unmount is handled by the effect below.
  //
  // The adapter is KEPT (not recreated) when:
  //  - isTransientNull: `walletType` (effectiveWalletType) is null but a device
  //    is still connected. walletType is derived from the Redux selected
  //    account and can transiently null during a send's account-context switch.
  //  - isSameAdapterType: effectiveWalletType swung away and back to the same
  //    type (e.g. ledger → null → ledger when setPendingOperationAddress
  //    restores the type mid-send). Recreating an identical adapter would call
  //    destroy() on a session with an in-flight APDU → "Adapter has been
  //    destroyed".
  // `deviceId` is intentionally NOT a dependency: device identity is owned and
  // re-pointed by the adapter itself (adapter.connect(deviceId)). Treating it
  // as a dep previously tore the adapter down mid-connect.
  useEffect(() => {
    const current = adapterRef.current;
    const isTransientNull = !walletType && Boolean(deviceId);
    const isSameAdapterType = current?.walletType === walletType;
    if (current && (isTransientNull || isSameAdapterType)) {
      // eslint-disable-next-line no-empty-function
      return () => {};
    }

    if (current) {
      current.destroy();
      adapterRef.current = null;
    }

    previousTransportAvailableRef.current = null;

    const enableDmk = isDmkEnabled(dmkFlagsRef.current);

    const adapter = walletType
      ? createAdapterWithCallbacks(walletType)
      : createAdapter(
          null,
          {
            // eslint-disable-next-line no-empty-function
            onDisconnect: () => {},
            onDeviceEvent,
          },
          enableDmk,
        );

    initializeAdapter(adapter);

    // eslint-disable-next-line no-empty-function
    return () => {};
    // createAdapterWithCallbacks + initializeAdapter are identity-stable
    // (deps: []), so this effect only re-runs when walletType changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletType, createAdapterWithCallbacks, initializeAdapter]);

  // Destroy the adapter + transport subscription only on real unmount (not on
  // walletType dep-changes, which are handled by the keep/recreate effect above).
  useEffect(
    () => () => {
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
    },
    // adapterRef / transportCleanupRef are stable refs; unmount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    isTransportAvailable,
    previousTransportAvailableRef,
    createAdapterWithCallbacks,
    initializeAdapter,
  };
};
