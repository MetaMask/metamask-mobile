import type { QRHardwareScanError } from '../../../core/HardwareWallet/errors';

/**
 * Checks whether a QR scan error has already been forwarded to the hardware wallet error flow.
 *
 * The scanner can receive repeated frames for the same invalid QR code while the camera remains
 * active. Comparing the user-facing message plus QR-specific metadata lets callers suppress
 * duplicate callbacks without hiding distinct scan failures.
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
