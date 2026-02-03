/**
 * QR Scanner navigation parameters
 */
export interface QRScannerParams {
  onScanSuccess?: (data: string) => void;
  onScanError?: (error: Error) => void;
  origin?: string;
}
