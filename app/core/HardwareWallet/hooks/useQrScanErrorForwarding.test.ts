import { act, renderHook } from '@testing-library/react-native';
import type { HardwareWalletError } from '@metamask/hw-wallet-sdk';

const mockShowHardwareWalletError = jest.fn();

jest.mock('../contexts', () => ({
  useHardwareWallet: () => ({
    showHardwareWalletError: mockShowHardwareWalletError,
  }),
}));

import { useQrScanErrorForwarding } from './useQrScanErrorForwarding';

describe('useQrScanErrorForwarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('closes the scanner and forwards QR scan errors after the modal hides', () => {
    const hideScanner = jest.fn();
    const scanError = new Error(
      'Scanned QR code is not in UR format',
    ) as HardwareWalletError;
    const { result } = renderHook(() =>
      useQrScanErrorForwarding({ hideScanner }),
    );

    act(() => {
      result.current.onQRHardwareScanError(scanError);
    });

    expect(hideScanner).toHaveBeenCalledTimes(1);
    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();

    act(() => {
      result.current.handleScannerModalHide();
    });

    expect(mockShowHardwareWalletError).toHaveBeenCalledWith(scanError);
  });

  it('does not forward an error when the modal hides without a pending QR scan error', () => {
    const hideScanner = jest.fn();
    const { result } = renderHook(() =>
      useQrScanErrorForwarding({ hideScanner }),
    );

    act(() => {
      result.current.handleScannerModalHide();
    });

    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
  });

  it('clears the pending QR scan error after forwarding it', () => {
    const hideScanner = jest.fn();
    const scanError = new Error('QR scan failed') as HardwareWalletError;
    const { result } = renderHook(() =>
      useQrScanErrorForwarding({ hideScanner }),
    );

    act(() => {
      result.current.onQRHardwareScanError(scanError);
      result.current.handleScannerModalHide();
      result.current.handleScannerModalHide();
    });

    expect(mockShowHardwareWalletError).toHaveBeenCalledTimes(1);
  });
});
