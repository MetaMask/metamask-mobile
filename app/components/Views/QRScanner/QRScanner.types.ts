/**
 * QR Scanner navigation parameters
 */

// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { ScanSuccess } from '../QRTabSwitcher';

export interface QRScannerParams {
  onScanSuccess: (data: ScanSuccess, content?: string) => void;
  onScanError?: (error: string) => void;
  origin?: string;
}
