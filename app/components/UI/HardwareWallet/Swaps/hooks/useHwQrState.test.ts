import { renderHook, act } from '@testing-library/react-native';
import { ConnectionStatus, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { useHwQrState } from './useHwQrState';
import { updateHardwareWalletsSwaps } from '../../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsEventType,
} from '../HardwareWalletsSwaps.state';
import type { HardwareWalletContextValue } from '../../../../../core/HardwareWallet/contexts';

jest.mock('../../../../../core/HardwareWallet', () => ({
  useHardwareWallet: jest.fn(),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  updateHardwareWalletsSwaps: jest.fn((action) => action),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn((action) => action),
  useSelector: jest.fn(),
}));

import { useHardwareWallet } from '../../../../../core/HardwareWallet';

const mockUseHardwareWallet = useHardwareWallet as jest.MockedFunction<
  typeof useHardwareWallet
>;

function makeQrScanRequest(id: string) {
  return {
    type: QrScanRequestType.SIGN,
    request: { id },
  } as unknown as NonNullable<
    HardwareWalletContextValue['qr']['pendingScanRequest']
  >;
}

function mockQrWallet(
  pendingScanRequest?: NonNullable<
    HardwareWalletContextValue['qr']['pendingScanRequest']
  >,
): HardwareWalletContextValue {
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

function renderQrState(options: {
  isEnabled?: boolean;
  currentStatus?: HardwareWalletsSwapsStatus;
}) {
  return renderHook(() =>
    useHwQrState({
      isEnabled: options.isEnabled ?? true,
      currentStatus:
        options.currentStatus ?? HardwareWalletsSwapsStatus.Waiting,
    }),
  );
}

describe('useHwQrState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHardwareWallet.mockReturnValue(mockLedgerWallet());
  });

  it('detects QR hardware wallet type', () => {
    mockUseHardwareWallet.mockReturnValue(mockQrWallet());

    const { result } = renderQrState({});

    expect(result.current.isQrHardwareWallet).toBe(true);
  });

  it('shows inline QR signing when in Waiting state with active QR request', () => {
    mockUseHardwareWallet.mockReturnValue(
      mockQrWallet(makeQrScanRequest('scan-1')),
    );

    const { result } = renderQrState({});

    expect(result.current.showInlineQrSigning).toBe(true);
  });

  it('does not show inline QR signing when not in Waiting state', () => {
    mockUseHardwareWallet.mockReturnValue(
      mockQrWallet(makeQrScanRequest('scan-1')),
    );

    const { result } = renderQrState({
      currentStatus: HardwareWalletsSwapsStatus.Submitted,
    });

    expect(result.current.showInlineQrSigning).toBe(false);
  });

  it('handleQrSignatureCancel calls cancel and dispatches REJECTED', () => {
    const mockQr = mockQrWallet();
    mockUseHardwareWallet.mockReturnValue(mockQr);

    const { result } = renderQrState({});

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
      ({
        pendingScanRequest,
      }: {
        pendingScanRequest: NonNullable<
          HardwareWalletContextValue['qr']['pendingScanRequest']
        >;
      }) => {
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

    const { result } = renderQrState({});

    expect(result.current.isQrHardwareWallet).toBe(false);
    expect(result.current.showInlineQrSigning).toBe(false);
  });

  it('returns false for showInlineQrSigning when disabled', () => {
    mockUseHardwareWallet.mockReturnValue(
      mockQrWallet(makeQrScanRequest('scan-1')),
    );

    const { result } = renderQrState({ isEnabled: false });

    expect(result.current.showInlineQrSigning).toBe(false);
  });

  describe('auto-cancel pending QR scan on terminal state', () => {
    const terminalStatuses: HardwareWalletsSwapsStatus[] = [
      HardwareWalletsSwapsStatus.Failed,
      HardwareWalletsSwapsStatus.Rejected,
      HardwareWalletsSwapsStatus.Cancelled,
      HardwareWalletsSwapsStatus.Disconnected,
    ];

    it.each(
      terminalStatuses.map((status) => ({
        status,
        statusName: status,
      })),
    )(
      'cancels pending QR scan request when status transitions to $statusName',
      ({ status }) => {
        const mockQr = mockQrWallet(makeQrScanRequest('scan-1'));
        mockUseHardwareWallet.mockReturnValue(mockQr);

        const { rerender } = renderHook(
          ({ currentStatus }: { currentStatus: HardwareWalletsSwapsStatus }) =>
            useHwQrState({
              isEnabled: true,
              currentStatus,
            }),
          {
            initialProps: { currentStatus: HardwareWalletsSwapsStatus.Waiting },
          },
        );

        expect(mockQr.qr.cancelQRScanRequestIfPresent).not.toHaveBeenCalled();

        rerender({ currentStatus: status });

        expect(mockQr.qr.cancelQRScanRequestIfPresent).toHaveBeenCalledTimes(1);
      },
    );

    it('does not cancel QR scan when transitioning to Submitted', () => {
      const mockQr = mockQrWallet(makeQrScanRequest('scan-1'));
      mockUseHardwareWallet.mockReturnValue(mockQr);

      const { rerender } = renderHook(
        ({ currentStatus }: { currentStatus: HardwareWalletsSwapsStatus }) =>
          useHwQrState({
            isEnabled: true,
            currentStatus,
          }),
        {
          initialProps: { currentStatus: HardwareWalletsSwapsStatus.Waiting },
        },
      );

      rerender({ currentStatus: HardwareWalletsSwapsStatus.Submitted });

      expect(mockQr.qr.cancelQRScanRequestIfPresent).not.toHaveBeenCalled();
    });

    it('does not cancel QR scan when already in terminal state', () => {
      const mockQr = mockQrWallet(makeQrScanRequest('scan-1'));
      mockUseHardwareWallet.mockReturnValue(mockQr);

      renderHook(() =>
        useHwQrState({
          isEnabled: true,
          currentStatus: HardwareWalletsSwapsStatus.Failed,
        }),
      );

      expect(mockQr.qr.cancelQRScanRequestIfPresent).not.toHaveBeenCalled();
    });

    it('does not cancel QR scan for non-QR wallets on terminal state', () => {
      const mockLedger = mockLedgerWallet();
      mockUseHardwareWallet.mockReturnValue(mockLedger);

      const { rerender } = renderHook(
        ({ currentStatus }: { currentStatus: HardwareWalletsSwapsStatus }) =>
          useHwQrState({
            isEnabled: true,
            currentStatus,
          }),
        {
          initialProps: { currentStatus: HardwareWalletsSwapsStatus.Waiting },
        },
      );

      rerender({ currentStatus: HardwareWalletsSwapsStatus.Failed });

      expect(mockLedger.qr.cancelQRScanRequestIfPresent).not.toHaveBeenCalled();
    });

    it('cancels QR scan only once when transitioning through multiple terminal states', () => {
      const mockQr = mockQrWallet(makeQrScanRequest('scan-1'));
      mockUseHardwareWallet.mockReturnValue(mockQr);

      const { rerender } = renderHook(
        ({ currentStatus }: { currentStatus: HardwareWalletsSwapsStatus }) =>
          useHwQrState({
            isEnabled: true,
            currentStatus,
          }),
        {
          initialProps: { currentStatus: HardwareWalletsSwapsStatus.Waiting },
        },
      );

      rerender({ currentStatus: HardwareWalletsSwapsStatus.Failed });
      expect(mockQr.qr.cancelQRScanRequestIfPresent).toHaveBeenCalledTimes(1);

      rerender({ currentStatus: HardwareWalletsSwapsStatus.Cancelled });
      expect(mockQr.qr.cancelQRScanRequestIfPresent).toHaveBeenCalledTimes(1);
    });
  });
});
