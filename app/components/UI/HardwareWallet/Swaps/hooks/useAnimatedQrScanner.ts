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
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';
import {
  createQRHardwareScanError,
  getQRHardwareScanErrorTitle,
  type QRHardwareScanError,
  QRHardwareScanErrorType,
} from '../../../../../core/HardwareWallet/errors';
import {
  buildQrHardwareWalletErrorAnalyticsProperties,
  isSameScanError,
} from '../../../QRHardware/AnimatedQRScanner.utils';
import {
  getExpectedUrTypes,
  sendQrHardwareErrorAnalytics,
  useCameraPermissionRefresh,
} from './qrScannerUtils';

/**
 * Options for {@link useAnimatedQrScanner}.
 *
 * @property isActive - Whether the scanner should actively process QR codes.
 * @property purpose - The type of QR scan being performed (e.g. `SIGN` or `PAIR`).
 * @property onScanSuccess - Callback with the decoded {@link UR}. Return `true` to accept and ignore further frames, or `false` to reject and keep scanning.
 */
interface UseAnimatedQrScannerOptions {
  isActive: boolean;
  purpose: QrScanRequestType;
  onScanSuccess: (ur: UR) => boolean;
}

/**
 * Options for the internal `showScanError` helper.
 *
 * @property errorType - Categorisation of the scan error.
 * @property technicalMessage - Optional low-level error detail for debugging.
 * @property receivedUrType - The UR type that was actually received (when applicable).
 * @property isUrFormat - Whether the scanned content used the UR encoding format.
 */
interface ShowScanErrorOptions {
  errorType: QRHardwareScanErrorType;
  technicalMessage?: string;
  receivedUrType?: string;
  isUrFormat: boolean;
}

/**
 * Hook that manages an animated QR code scanner for hardware wallet interactions.
 *
 * Handles the full lifecycle of scanning multi-part animated QR codes:
 * - Camera device selection and permission management.
 * - UR decoding progress tracking.
 * - Error detection, deduplication, and analytics reporting.
 * - Validation of decoded UR types against the expected types for the scan purpose.
 *
 * @param options - See {@link UseAnimatedQrScannerOptions}.
 * @returns Scanner state and controls including the camera device, code scanner
 * configuration, progress percentage, current error (if any), and a reset function.
 */
export function useAnimatedQrScanner({
  isActive,
  purpose,
  onScanSuccess,
}: UseAnimatedQrScannerOptions) {
  const urDecoderRef = useRef(new URRegistryDecoder());
  const [progress, setProgress] = useState(0);
  const [scanError, setScanError] = useState<QRHardwareScanError | null>(null);

  const scanErrorActiveRef = useRef(false);
  const scanSuccessActiveRef = useRef(false);
  const lastForwardedScanErrorRef = useRef<QRHardwareScanError | null>(null);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const cameraDevice = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const expectedUrTypes = useMemo(() => getExpectedUrTypes(purpose), [purpose]);

  useCameraPermissionRefresh({ isActive, hasPermission, requestPermission });

  const resetDecoder = useCallback(() => {
    urDecoderRef.current = new URRegistryDecoder();
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
      scanSuccessActiveRef.current = true;
      const accepted = onScanSuccess(ur);
      if (accepted) {
        lastForwardedScanErrorRef.current = null;
        resetDecoder();
      }
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
      const value = codes[0].value;
      if (!value) {
        return;
      }
      const content = value.trim();
      const isUrFormat = content.toLowerCase().startsWith('ur:');
      const decoder = urDecoderRef.current;

      try {
        if (!isUrFormat) {
          await showScanError({
            errorType: QRHardwareScanErrorType.NonURQrScanned,
            isUrFormat: false,
          });
          return;
        }

        decoder.receivePart(content);
        setProgress(Math.ceil(decoder.getProgress() * 100));

        if (decoder.isError()) {
          await showScanError({
            errorType: QRHardwareScanErrorType.URDecodeError,
            technicalMessage: decoder.resultError(),
            isUrFormat: true,
          });
        } else if (decoder.isSuccess()) {
          const ur = decoder.resultUR();
          if (expectedUrTypes.includes(ur.type)) {
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
    [isActive, expectedUrTypes, handleScanSuccess, showScanError],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: onBarCodeRead,
  });

  const onError = useCallback(
    (error: Error) => {
      if (!error) {
        return;
      }

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
