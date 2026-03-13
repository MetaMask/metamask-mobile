import { act, waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useBridgeConfirm } from './index';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { mockUseBridgeQuoteData } from '../../_mocks_/useBridgeQuoteData.mock';
import Routes from '../../../../../constants/navigation/Routes';
import { BigNumber } from 'ethers';

const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';

const mockLatestSourceBalance = {
  displayBalance: '2.0',
  atomicBalance: BigNumber.from('2000000000000000000'),
};

const defaultParams = {
  location: MetaMetricsSwapsEventSource.MainView,
  latestSourceBalance: mockLatestSourceBalance,
};

// Navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// useBridgeQuoteData
jest.mock('../useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest.fn(),
}));

// selectSourceWalletAddress
jest.mock('../../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../../selectors/bridge'),
  selectSourceWalletAddress: jest.fn(),
}));

// useSubmitBridgeTx
const mockSubmitBridgeTx = jest.fn();
jest.mock('../../../../../util/bridge/hooks/useSubmitBridgeTx', () => ({
  __esModule: true,
  default: () => ({ submitBridgeTx: mockSubmitBridgeTx }),
}));

// Engine (required by store / other transitive deps)
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

function renderHook(
  params: Parameters<typeof useBridgeConfirm>[0] = defaultParams,
) {
  return renderHookWithProvider(() => useBridgeConfirm(params), { state: {} });
}

describe('useBridgeConfirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useBridgeQuoteData).mockReturnValue({
      ...mockUseBridgeQuoteData,
      activeQuote: mockQuoteWithMetadata,
    } as ReturnType<typeof useBridgeQuoteData>);
    jest.mocked(selectSourceWalletAddress).mockReturnValue(WALLET_ADDRESS);
    mockSubmitBridgeTx.mockResolvedValue({ success: true });
  });

  it('returns a function', () => {
    const { result } = renderHook();

    expect(typeof result.current).toBe('function');
  });

  describe('successful submission', () => {
    it('calls submitBridgeTx with the correct quoteResponse and location', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current();
      });

      expect(mockSubmitBridgeTx).toHaveBeenCalledWith({
        quoteResponse: {
          ...mockQuoteWithMetadata,
          aggregator: mockQuoteWithMetadata.quote.bridgeId,
          walletAddress: WALLET_ADDRESS,
        },
        location: MetaMetricsSwapsEventSource.MainView,
      });
    });

    it('passes the location prop through to submitBridgeTx', async () => {
      const { result } = renderHook({
        ...defaultParams,
        location: MetaMetricsSwapsEventSource.MainView,
      });

      await act(async () => {
        await result.current();
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
        await result.current();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('resets isSubmittingTx to false after submission', async () => {
      const { result, store } = renderHook();

      await act(async () => {
        await result.current();
      });

      await waitFor(() => {
        expect(
          (store.getState() as { bridge: { isSubmittingTx: boolean } }).bridge
            .isSubmittingTx,
        ).toBe(false);
      });
    });

    it('passes latestSourceAtomicBalance to useBridgeQuoteData', () => {
      renderHook();

      expect(jest.mocked(useBridgeQuoteData)).toHaveBeenCalledWith(
        expect.objectContaining({
          latestSourceAtomicBalance: mockLatestSourceBalance.atomicBalance,
        }),
      );
    });

    it('passes undefined atomicBalance when latestSourceBalance is undefined', () => {
      renderHook({ ...defaultParams, latestSourceBalance: undefined });

      expect(jest.mocked(useBridgeQuoteData)).toHaveBeenCalledWith(
        expect.objectContaining({
          latestSourceAtomicBalance: undefined,
        }),
      );
    });
  });

  describe('when activeQuote is null', () => {
    beforeEach(() => {
      jest.mocked(useBridgeQuoteData).mockReturnValue({
        ...mockUseBridgeQuoteData,
        activeQuote: null,
      } as ReturnType<typeof useBridgeQuoteData>);
    });

    it('does not call submitBridgeTx', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current();
      });

      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });

    it('still navigates to TRANSACTIONS_VIEW', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });
  });

  describe('when walletAddress is missing', () => {
    beforeEach(() => {
      jest.mocked(selectSourceWalletAddress).mockReturnValue(undefined);
    });

    it('does not call submitBridgeTx', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current();
      });

      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });

    it('still navigates to TRANSACTIONS_VIEW', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
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
        await result.current();
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
        await result.current();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('resets isSubmittingTx to false after the error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      const { result, store } = renderHook();

      await act(async () => {
        await result.current();
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
