import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  Code,
} from 'react-native-vision-camera';
import { URRegistryDecoder } from '@keystonehq/ur-decoder';
import { UR } from '@ngraveio/bc-ur';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { withQrKeyring } from '../../../core/QrKeyring/QrKeyring';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import {
  createQRHardwareScanError,
  getQRHardwareScanErrorTitle,
  type QRHardwareScanError,
  QRHardwareScanErrorType,
} from '../../../core/HardwareWallet/errors';
import { isSameScanError } from './AnimatedQRScanner.utils';

interface UseAnimatedQrScannerOptions {
  isActive: boolean;
  purpose: QrScanRequestType;
  onScanSuccess: (ur: UR) => void;
}

function buildQrHardwareWalletErrorAnalyticsProperties(options: {
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

export function useAnimatedQrScanner({
  isActive,
  purpose,
  onScanSuccess,
}: UseAnimatedQrScannerOptions) {
  const [urDecoder, setURDecoder] = useState(() => new URRegistryDecoder());
  const [progress, setProgress] = useState(0);
  const [scanError, setScanError] = useState<QRHardwareScanError | null>(null);

  const scanErrorActiveRef = useRef(false);
  const lastForwardedScanErrorRef = useRef<QRHardwareScanError | null>(null);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const cameraDevice = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const expectedURTypes = useMemo(() => {
    if (purpose === QrScanRequestType.PAIR) {
      return [SUPPORTED_UR_TYPE.CRYPTO_HDKEY, SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT];
    }
    return [SUPPORTED_UR_TYPE.ETH_SIGNATURE];
  }, [purpose]);

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

  const resetDecoder = useCallback(() => {
    setURDecoder(new URRegistryDecoder());
    setProgress(0);
  }, []);

  const reset = useCallback(() => {
    scanErrorActiveRef.current = false;
    lastForwardedScanErrorRef.current = null;
    resetDecoder();
    setScanError(null);
  }, [resetDecoder]);

  const sendErrorAnalytics = useCallback(
    async (properties: Record<string, unknown>) => {
      try {
        const deviceName = await withQrKeyring(async ({ keyring }) =>
          keyring.getName(),
        );
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
            .addProperties({
              ...properties,
              device_model: deviceName,
              device_type: HardwareDeviceTypes.QR,
            })
            .build(),
        );
      } catch {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
            .addProperties({
              ...properties,
              device_model: 'Unknown',
              device_type: HardwareDeviceTypes.QR,
            })
            .build(),
        );
      }
    },
    [trackEvent, createEventBuilder],
  );

  const showScannerError = useCallback(
    async (error: QRHardwareScanError) => {
      if (scanErrorActiveRef.current) {
        return;
      }

      const isDuplicate = isSameScanError(
        lastForwardedScanErrorRef.current,
        error,
      );
      if (isDuplicate) {
        return;
      }

      scanErrorActiveRef.current = true;
      resetDecoder();

      lastForwardedScanErrorRef.current = error;
      setScanError(error);

      sendErrorAnalytics(
        buildQrHardwareWalletErrorAnalyticsProperties({
          error: error.message,
          error_category: error.metadata.qrHardwareScanErrorType,
          is_ur_format: error.metadata.isUrFormat,
          received_ur_type: error.metadata.receivedUrType,
        }),
      ).catch(() => undefined);
    },
    [resetDecoder, sendErrorAnalytics],
  );

  const onBarCodeRead = useCallback(
    async (codes: Code[]) => {
      if (!isActive || scanErrorActiveRef.current || !codes.length) {
        return;
      }
      const response = { data: codes[0].value };
      if (!response.data) {
        return;
      }
      const content = response.data.trim();
      const isUrFormat = content.toLowerCase().startsWith('ur:');

      try {
        if (!isUrFormat) {
          await showScannerError(
            createQRHardwareScanError({
              errorType: QRHardwareScanErrorType.NonURQrScanned,
              purpose,
              isUrFormat: false,
            }),
          );
          return;
        }

        urDecoder.receivePart(content);
        setProgress(Math.ceil(urDecoder.getProgress() * 100));

        if (urDecoder.isError()) {
          await showScannerError(
            createQRHardwareScanError({
              errorType: QRHardwareScanErrorType.URDecodeError,
              purpose,
              technicalMessage: urDecoder.resultError(),
              isUrFormat: true,
            }),
          );
        } else if (urDecoder.isSuccess()) {
          const ur = urDecoder.resultUR();
          if (expectedURTypes.includes(ur.type)) {
            scanErrorActiveRef.current = false;
            lastForwardedScanErrorRef.current = null;
            onScanSuccess(ur);
            setProgress(0);
            setURDecoder(new URRegistryDecoder());
          } else {
            await showScannerError(
              createQRHardwareScanError({
                errorType: QRHardwareScanErrorType.WrongURType,
                purpose,
                receivedUrType: ur.type,
                isUrFormat: true,
              }),
            );
          }
        }
      } catch (e) {
        await showScannerError(
          createQRHardwareScanError({
            errorType: QRHardwareScanErrorType.ScanException,
            purpose,
            technicalMessage: e instanceof Error ? e.message : String(e),
            isUrFormat,
          }),
        );
      }
    },
    [
      isActive,
      urDecoder,
      expectedURTypes,
      purpose,
      onScanSuccess,
      showScannerError,
    ],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: onBarCodeRead,
  });

  const onError = useCallback(
    async (error: Error) => {
      sendErrorAnalytics(
        buildQrHardwareWalletErrorAnalyticsProperties({
          error: error.message,
          is_ur_format: false,
        }),
      );
    },
    [sendErrorAnalytics],
  );

  const errorTitle = useMemo(
    () => (scanError ? getQRHardwareScanErrorTitle(scanError) : null),
    [scanError],
  );

  return {
    cameraDevice,
    hasPermission,
    codeScanner,
    progress,
    scanError,
    errorTitle,
    reset,
    onError,
  };
}
