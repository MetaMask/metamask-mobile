import type { QRHardwareScanError } from '../../../core/HardwareWallet/errors';

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
