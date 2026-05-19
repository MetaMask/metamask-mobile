/**
 * QR Scanner navigation parameters
 */

// eslint-disable-next-line import-x/no-restricted-paths -- TODO(WPC-403): allowed by ADR-0020 backlog
import type { ScanSuccess } from '../QRTabSwitcher';

export interface QRScannerParams {
  onScanSuccess: (data: ScanSuccess, content?: string) => void;
  onScanError?: (error: string) => void;
  origin?: string;
}
