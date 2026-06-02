import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  type QRHardwareScanError,
  QRHardwareScanErrorType,
} from '../../../../../core/HardwareWallet/errors';
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
 * Builds a flat analytics payload for a QR hardware wallet scan error.
 *
 * @param options - Error details.
 * @param options.error - Human-readable error message.
 * @param options.error_category - Optional categorisation of the error type.
 * @param options.is_ur_format - Whether the scanned QR code used the UR format.
 * @param options.received_ur_type - The UR type string received (included when `error_category` is `WrongURType`).
 * @returns A key-value record suitable for analytics event properties.
 */
export function buildQrHardwareWalletErrorAnalyticsProperties(options: {
  error: string;
  error_category?: QRHardwareScanErrorType;
  is_ur_format: boolean;
  received_ur_type?: string;
}): Record<string, unknown> {
  const { error, error_category, is_ur_format, received_ur_type } = options;
  const payload: Record<string, unknown> = {
    error,
    is_ur_format,
  };

  if (error_category !== undefined) {
    payload.error_category = error_category;
  }

  if (error_category === QRHardwareScanErrorType.WrongURType) {
    payload.received_ur_type = received_ur_type ?? '';
  }

  return payload;
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
export function getExpectedURTypes(purpose: QrScanRequestType): string[] {
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
 * @param properties - Analytics payload (typically from {@link buildQrHardwareWalletErrorAnalyticsProperties}).
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

  try {
    const deviceName = await withQrKeyring(async ({ keyring }) =>
      keyring.getName(),
    );
    trackHardwareWalletError(deviceName);
  } catch {
    trackHardwareWalletError('Unknown');
  }
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

/**
 * Compares two scan errors for equality based on message and metadata fields.
 *
 * @param previousError - The previous error (or `null` if none).
 * @param currentError - The current error.
 * @returns `true` when both errors carry the same message, type, UR format flag, and received UR type.
 */
export function isSameScanError(
  previousError: QRHardwareScanError | null,
  currentError: QRHardwareScanError,
): boolean {
  if (!previousError) {
    return false;
  }

  return (
    previousError.message === currentError.message &&
    previousError.metadata.qrHardwareScanErrorType ===
      currentError.metadata.qrHardwareScanErrorType &&
    previousError.metadata.isUrFormat === currentError.metadata.isUrFormat &&
    previousError.metadata.receivedUrType ===
      currentError.metadata.receivedUrType
  );
}
