/**
 * QR Scanner navigation parameters
 */

import type { ScanSuccess } from '../QRTabSwitcher';

export interface QRScannerParams {
  onScanSuccess: (data: ScanSuccess, content?: string) => void;
  onScanError?: (error: string) => void;
  origin?: string;
}
