import { renderHook, act } from '@testing-library/react-native';
import { ConnectionStatus, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { useHwQrState } from './useHwQrState';
import { updateHardwareWalletsSwaps } from '../../../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsStatus, HardwareWalletsSwapsEventType } from '../HardwareWalletsSwaps.state';
import type { HardwareWalletContextValue } from '../../../../../../core/HardwareWallet/contexts';

jest.mock('../../../../../../core/HardwareWallet', () => ({
  useHardwareWallet: jest.fn(),
}));

jest.mock('../../../../../../core/redux/slices/bridge', () => ({
  updateHardwareWalletsSwaps: jest.fn((action) => action),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn((action) => action),
  useSelector: jest.fn(),
}));

import { useHardwareWallet } from '../../../../../../core/HardwareWallet';

const mockUseHardwareWallet = useHardwareWallet as jest.MockedFunction<
  typeof useHardwareWallet
>;

function makeQrScanRequest(id: string) {
  return { type: QrScanRequestType.SIGN, request: { id } } as unknown as NonNullable<HardwareWalletContextValue['qr']['pendingScanRequest']>;
}

function mockQrWallet(pendingScanRequest?: NonNullable<HardwareWalletContextValue['qr']['pendingScanRequest']>): HardwareWalletContextValue {
  return {
    walletType: HardwareWalletType.Qr,
    deviceId: null,
    connectionState: { status: ConnectionStatus.Ready },
    deviceSelection: {
      devices: [],
      selectedDevice: null,
      isScanning: false,
      scanError: null,
    },
    ensureDeviceReady: jest.fn(),
    setTargetWalletType: jest.fn(),
    setPendingOperationAddress: jest.fn(),
    showHardwareWalletError: jest.fn(),
    showAwaitingConfirmation: jest.fn(),
    hideAwaitingConfirmation: jest.fn(),
    qr: {
      pendingScanRequest,
      isSigningQRObject: false,
      setRequestCompleted: jest.fn(),
      isRequestCompleted: false,
      cancelQRScanRequestIfPresent: jest.fn(),
    },
  };
}

function mockLedgerWallet(): HardwareWalletContextValue {
  return {
    walletType: HardwareWalletType.Ledger,
    deviceId: null,
    connectionState: { status: ConnectionStatus.Ready },
    deviceSelection: {
      devices: [],
      selectedDevice: null,
      isScanning: false,
      scanError: null,
    },
    ensureDeviceReady: jest.fn(),
    setTargetWalletType: jest.fn(),
    setPendingOperationAddress: jest.fn(),
    showHardwareWalletError: jest.fn(),
    showAwaitingConfirmation: jest.fn(),
    hideAwaitingConfirmation: jest.fn(),
    qr: {
      pendingScanRequest: undefined,
      isSigningQRObject: false,
      setRequestCompleted: jest.fn(),
      isRequestCompleted: false,
      cancelQRScanRequestIfPresent: jest.fn(),
    },
  };
}

describe('useHwQrState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHardwareWallet.mockReturnValue(mockLedgerWallet());
  });

  it('detects QR hardware wallet type', () => {
    mockUseHardwareWallet.mockReturnValue(mockQrWallet());

    const { result } = renderHook(() =>
      useHwQrState({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
      }),
    );

    expect(result.current.isQrHardwareWallet).toBe(true);
  });

  it('shows inline QR signing when in Waiting state with active QR request', () => {
    mockUseHardwareWallet.mockReturnValue(mockQrWallet(makeQrScanRequest('scan-1')));

    const { result } = renderHook(() =>
      useHwQrState({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
      }),
    );

    expect(result.current.showInlineQrSigning).toBe(true);
  });

  it('does not show inline QR signing when not in Waiting state', () => {
    mockUseHardwareWallet.mockReturnValue(mockQrWallet(makeQrScanRequest('scan-1')));

    const { result } = renderHook(() =>
      useHwQrState({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Submitted,
      }),
    );

    expect(result.current.showInlineQrSigning).toBe(false);
  });

  it('handleQrSignatureCancel calls cancel and dispatches REJECTED', () => {
    const mockQr = mockQrWallet();
    mockUseHardwareWallet.mockReturnValue(mockQr);

    const { result } = renderHook(() =>
      useHwQrState({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
      }),
    );

    act(() => {
      result.current.handleQrSignatureCancel();
    });

    expect(mockQr.qr.cancelQRScanRequestIfPresent).toHaveBeenCalledTimes(1);
    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Rejected,
    });
  });

  it('resets isReadingQrSignature when request ID changes', () => {
    const { result, rerender } = renderHook(
      ({ pendingScanRequest }: { pendingScanRequest: NonNullable<HardwareWalletContextValue['qr']['pendingScanRequest']> }) => {
        mockUseHardwareWallet.mockReturnValue(mockQrWallet(pendingScanRequest));
        return useHwQrState({
          isEnabled: true,
          currentStatus: HardwareWalletsSwapsStatus.Waiting,
        });
      },
      {
        initialProps: { pendingScanRequest: makeQrScanRequest('scan-1') },
      },
    );

    act(() => {
      result.current.setIsReadingQrSignature(true);
    });

    expect(result.current.isReadingQrSignature).toBe(true);

    rerender({ pendingScanRequest: makeQrScanRequest('scan-2') });

    expect(result.current.isReadingQrSignature).toBe(false);
  });

  it('returns false for showInlineQrSigning when not a QR wallet', () => {
    mockUseHardwareWallet.mockReturnValue(mockLedgerWallet());

    const { result } = renderHook(() =>
      useHwQrState({
        isEnabled: true,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
      }),
    );

    expect(result.current.isQrHardwareWallet).toBe(false);
    expect(result.current.showInlineQrSigning).toBe(false);
  });

  it('returns false for showInlineQrSigning when disabled', () => {
    mockUseHardwareWallet.mockReturnValue(mockQrWallet(makeQrScanRequest('scan-1')));

    const { result } = renderHook(() =>
      useHwQrState({
        isEnabled: false,
        currentStatus: HardwareWalletsSwapsStatus.Waiting,
      }),
    );

    expect(result.current.showInlineQrSigning).toBe(false);
  });
});
