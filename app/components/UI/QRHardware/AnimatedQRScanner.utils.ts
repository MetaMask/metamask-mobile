import {
  type QRHardwareScanError,
  QRHardwareScanErrorType,
} from '../../../core/HardwareWallet/errors';

/**
 * Builds {@link MetaMetricsEvents.HARDWARE_WALLET_ERROR} properties for QR hardware flows.
 *
 * - `error_category` — set for decode / scan pipeline failures (not for native camera errors).
 * - `received_ur_type` — only when `error_category` is `wrong_ur_type` (decoded UR type mismatch).
 * - `is_ur_format` — whether the scanned payload (trimmed) starts with `ur:` (case-insensitive).
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
