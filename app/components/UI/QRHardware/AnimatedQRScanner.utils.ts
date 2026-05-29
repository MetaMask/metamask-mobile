import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  type QRHardwareScanError,
  QRHardwareScanErrorType,
} from '../../../core/HardwareWallet/errors';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import { MetaMetricsEvents } from '../../../core/Analytics';
import type { UseAnalyticsHook } from '../../../components/hooks/useAnalytics/useAnalytics.types';
import { withQrKeyring } from '../../../core/QrKeyring/QrKeyring';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';

type ErrorAnalyticsDependencies = Pick<
  UseAnalyticsHook,
  'trackEvent' | 'createEventBuilder'
>;

interface CameraPermissionRefreshOptions {
  isActive: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<unknown>;
}

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

export function getExpectedURTypes(purpose: QrScanRequestType): string[] {
  if (purpose === QrScanRequestType.PAIR) {
    return [SUPPORTED_UR_TYPE.CRYPTO_HDKEY, SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT];
  }

  return [SUPPORTED_UR_TYPE.ETH_SIGNATURE];
}

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
          /inactive|background/.test(appState.current) &&
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
 * Returns `true` when two {@link QRHardwareScanError} instances carry the same message and
 * metadata, meaning they represent the same underlying scan failure.
 *
 * The QR camera emits a continuous frame stream. While pointed at an invalid code the decoder
 * produces the same error repeatedly — this function lets callers forward the error callback only
 * once, avoiding duplicate decoder resets and analytics events.
 *
 * @param previousError - The last error that was forwarded, or `null` if none yet.
 * @param currentError - The newly received scan error to compare.
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
