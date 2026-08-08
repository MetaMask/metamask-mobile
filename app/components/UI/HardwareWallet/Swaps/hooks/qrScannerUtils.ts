import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { SUPPORTED_UR_TYPE } from '../../../../../constants/qr';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { UseAnalyticsHook } from '../../../../../components/hooks/useAnalytics/useAnalytics.types';
import { withQrKeyring } from '../../../../../core/QrKeyring/QrKeyring';
import { HardwareDeviceTypes } from '../../../../../constants/keyringTypes';

/**
 * Subset of {@link UseAnalyticsHook} required for error analytics tracking.
 */
type ErrorAnalyticsDependencies = Pick<
  UseAnalyticsHook,
  'trackEvent' | 'createEventBuilder'
>;

/**
 * Options for {@link useCameraPermissionRefresh}.
 *
 * @property isActive - Whether the scanner is currently active.
 * @property hasPermission - Whether camera permission has already been granted.
 * @property requestPermission - Async function that prompts the user for camera permission.
 */
interface CameraPermissionRefreshOptions {
  isActive: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<unknown>;
}

/**
 * Returns the list of expected UR types for the given scan purpose.
 *
 * - `PAIR` → `crypto-hdkey` and `crypto-account`.
 * - `SIGN` (default) → `eth-signature`.
 *
 * @param purpose - The QR scan request type.
 * @returns An array of expected UR type strings.
 */
export function getExpectedUrTypes(purpose: QrScanRequestType): string[] {
  if (purpose === QrScanRequestType.PAIR) {
    return [SUPPORTED_UR_TYPE.CRYPTO_HDKEY, SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT];
  }

  return [SUPPORTED_UR_TYPE.ETH_SIGNATURE];
}

/**
 * Sends a hardware wallet error analytics event enriched with device info.
 *
 * Resolves the QR keyring device name on best-effort basis; falls back to
 * `"Unknown"` if the keyring is unavailable.
 *
 * @param properties - Analytics payload (typically from {@link buildQrHardwareWalletErrorAnalyticsProperties} in `AnimatedQRScanner.utils`).
 * @param deps - Analytics helpers for tracking events.
 */
export async function sendQrHardwareErrorAnalytics(
  properties: Record<string, unknown>,
  { trackEvent, createEventBuilder }: ErrorAnalyticsDependencies,
) {
  const trackHardwareWalletError = (deviceName: string) => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
        .addProperties({
          ...properties,
          device_model: deviceName,
          device_type: HardwareDeviceTypes.QR,
        })
        .build(),
    );
  };

  let deviceName = 'Unknown';
  try {
    deviceName = await withQrKeyring(async ({ keyring }) => keyring.getName());
  } catch {
    // Keyring unavailable — keep fallback device name.
  }

  trackHardwareWalletError(deviceName);
}

/**
 * Hook that ensures camera permission is requested when the scanner is active.
 *
 * Requests permission immediately on mount and again every time the app
 * returns to the foreground, as long as the scanner is active and permission
 * has not yet been granted.
 *
 * @param options - See {@link CameraPermissionRefreshOptions}.
 */
export function useCameraPermissionRefresh({
  isActive,
  hasPermission,
  requestPermission,
}: CameraPermissionRefreshOptions) {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const refreshCameraPermission = useCallback(() => {
    if (!isActive || hasPermission) {
      return;
    }

    requestPermission();
  }, [hasPermission, requestPermission, isActive]);

  useEffect(() => {
    refreshCameraPermission();
  }, [refreshCameraPermission]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        const hasReturnedToForeground =
          (appState.current === 'inactive' ||
            appState.current === 'background') &&
          nextAppState === 'active';

        appState.current = nextAppState;

        if (hasReturnedToForeground) {
          refreshCameraPermission();
        }
      },
    );

    return () => {
      subscription?.remove?.();
    };
  }, [refreshCameraPermission, isActive]);
}
