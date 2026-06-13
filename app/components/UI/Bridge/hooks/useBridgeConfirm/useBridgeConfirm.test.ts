import { act, waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useBridgeConfirm } from './index';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { useABTest } from '../../../../../hooks';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import Routes from '../../../../../constants/navigation/Routes';
import { PostTradeStatus } from '../../components/PostTradeBottomSheet/PostTradeBottomSheet.types';
import {
  POST_TRADE_MODAL_VARIANTS,
  PostTradeModalVariant,
} from '../../components/PostTradeBottomSheet/abTestConfig';
import { mockBridgeReducerState } from '../../_mocks_/bridgeReducerState';
import type { RootState } from '../../../../../reducers';

const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';

const defaultParams = {
  activeQuote: mockQuoteWithMetadata,
  location: MetaMetricsSwapsEventSource.MainView,
};

// Navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
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

jest.mock('../../../../../hooks', () => ({
  useABTest: jest.fn(),
}));
const mockUseABTest = jest.mocked(useABTest);

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
  state = {},
) {
  return renderHookWithProvider(() => useBridgeConfirm(params), { state });
}

describe('useBridgeConfirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectSourceWalletAddress).mockReturnValue(WALLET_ADDRESS);
    mockSubmitBridgeTx.mockResolvedValue({
      id: 'tx-meta-id',
      hash: '0xabc',
      status: 'submitted',
    });
    mockUseABTest.mockReturnValue({
      variant: POST_TRADE_MODAL_VARIANTS[PostTradeModalVariant.Treatment],
      variantName: PostTradeModalVariant.Treatment,
      isActive: true,
    });
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
        quoteResponse: mockQuoteWithMetadata,
        location: MetaMetricsSwapsEventSource.MainView,
      });
    });

    it('opens the post-trade bottom sheet after submission', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.POST_TRADE_MODAL,
        params: expect.objectContaining({
          status: PostTradeStatus.InProgress,
          transactionMetaId: 'tx-meta-id',
          transactionHash: '0xabc',
          sourceAmount: mockQuoteWithMetadata.sentAmount.amount,
          destAmount: mockQuoteWithMetadata.toTokenAmount.amount,
        }),
      });
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

    it('clears bridge token inputs and refreshes source balance before opening the post-trade bottom sheet', async () => {
      const { result, store } = renderHook(defaultParams, {
        bridge: mockBridgeReducerState,
      });

      mockNavigate.mockImplementationOnce(() => {
        const bridgeState = (store.getState() as RootState).bridge;

        expect(bridgeState.sourceAmount).toBeUndefined();
        expect(bridgeState.destAmount).toBeUndefined();
        expect(bridgeState.sourceToken).toEqual(
          mockBridgeReducerState.sourceToken,
        );
        expect(bridgeState.destToken).toEqual(mockBridgeReducerState.destToken);
        expect(bridgeState.balanceRefreshKey).toBe(1);
      });

      await act(async () => {
        await result.current();
      });

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe.each([
    ['activeQuote is null', { activeQuote: null }],
    ['walletAddress is missing', {}],
  ])('when %s', (_label, hookParams) => {
    beforeEach(() => {
      if (!('activeQuote' in hookParams)) {
        jest.mocked(selectSourceWalletAddress).mockReturnValue(undefined);
      }
    });

    it('does not submit or open the post-trade bottom sheet', async () => {
      const { result } = renderHook({ ...defaultParams, ...hookParams });

      await act(async () => {
        await result.current();
      });

      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
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
        await result.current();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error submitting bridge tx',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('opens the post-trade bottom sheet in failed state after the error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      const { result } = renderHook();

      await act(async () => {
        await result.current();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.POST_TRADE_MODAL,
        params: expect.objectContaining({
          status: PostTradeStatus.Failed,
          sourceAmount: mockQuoteWithMetadata.sentAmount.amount,
          destAmount: mockQuoteWithMetadata.toTokenAmount.amount,
        }),
      });
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

    it('does not clear bridge token inputs when submission fails before broadcast', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      const { result, store } = renderHook(defaultParams, {
        bridge: mockBridgeReducerState,
      });

      await act(async () => {
        await result.current();
      });

      const bridgeState = (store.getState() as RootState).bridge;
      expect(bridgeState.sourceAmount).toBe(
        mockBridgeReducerState.sourceAmount,
      );
      expect(bridgeState.sourceToken).toEqual(
        mockBridgeReducerState.sourceToken,
      );
      expect(bridgeState.destToken).toEqual(mockBridgeReducerState.destToken);
    });
  });
});
