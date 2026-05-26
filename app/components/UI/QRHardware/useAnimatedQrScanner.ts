import { useCallback, useMemo, useRef, useState } from 'react';
import {
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  Code,
} from 'react-native-vision-camera';
import { URRegistryDecoder } from '@keystonehq/ur-decoder';
import { UR } from '@ngraveio/bc-ur';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import {
  createQRHardwareScanError,
  getQRHardwareScanErrorTitle,
  type QRHardwareScanError,
  QRHardwareScanErrorType,
} from '../../../core/HardwareWallet/errors';
import {
  buildQrHardwareWalletErrorAnalyticsProperties,
  getExpectedURTypes,
  isSameScanError,
  sendQrHardwareErrorAnalytics,
  useCameraPermissionRefresh,
} from './AnimatedQRScanner.utils';

interface UseAnimatedQrScannerOptions {
  isActive: boolean;
  purpose: QrScanRequestType;
  onScanSuccess: (ur: UR) => void;
}

interface ShowScanErrorOptions {
  errorType: QRHardwareScanErrorType;
  technicalMessage?: string;
  receivedUrType?: string;
  isUrFormat: boolean;
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
  const scanSuccessActiveRef = useRef(false);
  const lastForwardedScanErrorRef = useRef<QRHardwareScanError | null>(null);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const cameraDevice = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const expectedURTypes = useMemo(() => getExpectedURTypes(purpose), [purpose]);

  useCameraPermissionRefresh({ isActive, hasPermission, requestPermission });

  const resetDecoder = useCallback(() => {
    setURDecoder(new URRegistryDecoder());
    setProgress(0);
  }, []);

  const reset = useCallback(() => {
    scanErrorActiveRef.current = false;
    scanSuccessActiveRef.current = false;
    lastForwardedScanErrorRef.current = null;
    resetDecoder();
    setScanError(null);
  }, [resetDecoder]);

  const sendErrorAnalytics = useCallback(
    async (properties: Record<string, unknown>) => {
      await sendQrHardwareErrorAnalytics(properties, {
        trackEvent,
        createEventBuilder,
      });
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

  const showScanError = useCallback(
    async (options: ShowScanErrorOptions) => {
      await showScannerError(
        createQRHardwareScanError({ ...options, purpose }),
      );
    },
    [purpose, showScannerError],
  );

  const handleScanSuccess = useCallback(
    (ur: UR) => {
      // Avoid duplicate camera frames resolving the same animated QR payload.
      scanSuccessActiveRef.current = true;
      lastForwardedScanErrorRef.current = null;
      onScanSuccess(ur);
      resetDecoder();
    },
    [onScanSuccess, resetDecoder],
  );

  const onBarCodeRead = useCallback(
    async (codes: Code[]) => {
      if (
        !isActive ||
        scanErrorActiveRef.current ||
        scanSuccessActiveRef.current ||
        !codes.length
      ) {
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
          await showScanError({
            errorType: QRHardwareScanErrorType.NonURQrScanned,
            isUrFormat: false,
          });
          return;
        }

        urDecoder.receivePart(content);
        setProgress(Math.ceil(urDecoder.getProgress() * 100));

        if (urDecoder.isError()) {
          await showScanError({
            errorType: QRHardwareScanErrorType.URDecodeError,
            technicalMessage: urDecoder.resultError(),
            isUrFormat: true,
          });
        } else if (urDecoder.isSuccess()) {
          const ur = urDecoder.resultUR();
          if (expectedURTypes.includes(ur.type)) {
            handleScanSuccess(ur);
          } else {
            await showScanError({
              errorType: QRHardwareScanErrorType.WrongURType,
              receivedUrType: ur.type,
              isUrFormat: true,
            });
          }
        }
      } catch (e) {
        await showScanError({
          errorType: QRHardwareScanErrorType.ScanException,
          technicalMessage: e instanceof Error ? e.message : String(e),
          isUrFormat,
        });
      }
    },
    [isActive, urDecoder, expectedURTypes, handleScanSuccess, showScanError],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: onBarCodeRead,
  });

  const onError = useCallback(
    (error: Error) => {
      sendErrorAnalytics(
        buildQrHardwareWalletErrorAnalyticsProperties({
          error: error.message,
          is_ur_format: false,
        }),
      ).catch(() => undefined);
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
