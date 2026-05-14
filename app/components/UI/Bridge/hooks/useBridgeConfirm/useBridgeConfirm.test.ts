import { act, waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useBridgeConfirm } from './index';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import Routes from '../../../../../constants/navigation/Routes';
import { isHardwareAccount } from '../../../../../util/address';
import { HardwareWalletsSwapsStatus } from '../../Views/HardwareWalletsSwaps/HardwareWalletsSwaps.state';

const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';

const defaultParams = {
  activeQuote: mockQuoteWithMetadata,
  location: MetaMetricsSwapsEventSource.MainView,
};

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../../selectors/bridge'),
  selectSourceWalletAddress: jest.fn(),
}));

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  isHardwareAccount: jest.fn(),
}));

const mockSubmitBridgeTx = jest.fn();
jest.mock('../../../../../util/bridge/hooks/useSubmitBridgeTx', () => ({
  __esModule: true,
  default: () => ({ submitBridgeTx: mockSubmitBridgeTx }),
}));

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  context: {
    KeyringController: { state: { keyrings: [] } },
    BridgeController: { resetState: jest.fn() },
  },
}));

jest.mock(
  '../../../../../multichain-accounts/controllers/account-tree-controller',
  () => ({
    accountTreeControllerInit: jest.fn(() => ({
      controller: { state: { accountTree: { wallets: {} } } },
    })),
  }),
);

jest.mock('../../../../../selectors/confirmTransaction');

jest.mock(
  '../../Views/HardwareWalletsSwaps/hooks/useHwConnectionMonitoring',
  () => ({
    useHwConnectionMonitoring: jest.fn(() => ({
      isDisconnectedRef: { current: false },
      resetHandledError: jest.fn(),
    })),
  }),
);

jest.mock('../../Views/HardwareWalletsSwaps/hooks/useHwQrState', () => ({
  useHwQrState: jest.fn(() => ({
    isReadingQrSignature: false,
    setIsReadingQrSignature: jest.fn(),
    isQrHardwareWallet: false,
    showInlineQrSigning: false,
    handleQrSignatureCancel: jest.fn(),
    pendingScanRequest: undefined,
  })),
}));

function renderHook(
  params: Parameters<typeof useBridgeConfirm>[0] = defaultParams,
) {
  return renderHookWithProvider(() => useBridgeConfirm(params), { state: {} });
}

describe('useBridgeConfirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectSourceWalletAddress).mockReturnValue(WALLET_ADDRESS);
    jest.mocked(isHardwareAccount).mockReturnValue(false);
    mockSubmitBridgeTx.mockResolvedValue({ success: true });
  });

  it('returns an object with handleConfirm', () => {
    const { result } = renderHook();

    expect(typeof result.current.handleConfirm).toBe('function');
  });

  describe('successful submission', () => {
    it('calls submitBridgeTx with the correct quoteResponse and location', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockSubmitBridgeTx).toHaveBeenCalledWith({
        quoteResponse: mockQuoteWithMetadata,
        location: MetaMetricsSwapsEventSource.MainView,
      });
    });

    it('passes the location prop through to submitBridgeTx', async () => {
      const { result } = renderHook({
        ...defaultParams,
        location: MetaMetricsSwapsEventSource.MainView,
      });

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockSubmitBridgeTx).toHaveBeenCalledWith(
        expect.objectContaining({
          location: MetaMetricsSwapsEventSource.MainView,
        }),
      );
    });

    it('navigates to TRANSACTIONS_VIEW after submission', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('resets isSubmittingTx to false after submission', async () => {
      const { result, store } = renderHook();

      await act(async () => {
        await result.current.handleConfirm();
      });

      await waitFor(() => {
        expect(
          (store.getState() as { bridge: { isSubmittingTx: boolean } }).bridge
            .isSubmittingTx,
        ).toBe(false);
      });
    });
  });

  describe('hardware wallet submissions', () => {
    it('navigates to hardware wallets progress view without calling submitBridgeTx', async () => {
      jest.mocked(isHardwareAccount).mockReturnValue(true);
      const { result } = renderHook({
        ...defaultParams,
        activeQuote: {
          ...mockQuoteWithMetadata,
          approval: {},
        },
      });

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.HARDWARE_WALLETS_SWAPS,
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });

    it('sets Waiting status for hardware wallet submissions', async () => {
      jest.mocked(isHardwareAccount).mockReturnValue(true);
      const { result, store } = renderHook();

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(
        (
          store.getState() as {
            bridge: {
              hardwareWalletsSwaps: { status: string };
            };
          }
        ).bridge.hardwareWalletsSwaps.status,
      ).toBe(HardwareWalletsSwapsStatus.Waiting);
    });

    it('starts two-step progress for hardware wallet submissions with approval', async () => {
      jest.mocked(isHardwareAccount).mockReturnValue(true);
      const { result, store } = renderHook({
        ...defaultParams,
        activeQuote: {
          ...mockQuoteWithMetadata,
          approval: {},
        },
      });

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(
        (
          store.getState() as {
            bridge: {
              hardwareWalletsSwaps: { totalSteps: number };
            };
          }
        ).bridge.hardwareWalletsSwaps.totalSteps,
      ).toBe(2);
    });

    it('starts one-step progress for hardware wallet submissions without approval', async () => {
      jest.mocked(isHardwareAccount).mockReturnValue(true);
      const { result, store } = renderHook();

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(
        (
          store.getState() as {
            bridge: {
              hardwareWalletsSwaps: { totalSteps: number };
            };
          }
        ).bridge.hardwareWalletsSwaps.totalSteps,
      ).toBe(1);
    });
  });

  describe('when activeQuote is null', () => {
    it('does not call submitBridgeTx', async () => {
      const { result } = renderHook({ ...defaultParams, activeQuote: null });

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });

    it('does not navigate', async () => {
      const { result } = renderHook({ ...defaultParams, activeQuote: null });

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('when walletAddress is missing', () => {
    beforeEach(() => {
      jest.mocked(selectSourceWalletAddress).mockReturnValue(undefined);
    });

    it('does not call submitBridgeTx', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });

    it('does not navigate', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('when submitBridgeTx throws', () => {
    beforeEach(() => {
      mockSubmitBridgeTx.mockRejectedValue(new Error('Network error'));
    });

    it('logs the error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { result } = renderHook();

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error submitting bridge tx',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('still navigates to TRANSACTIONS_VIEW after the error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      const { result } = renderHook();

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('resets isSubmittingTx to false after the error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      const { result, store } = renderHook();

      await act(async () => {
        await result.current.handleConfirm();
      });

      await waitFor(() => {
        expect(
          (store.getState() as { bridge: { isSubmittingTx: boolean } }).bridge
            .isSubmittingTx,
        ).toBe(false);
      });
    });
  });
});
