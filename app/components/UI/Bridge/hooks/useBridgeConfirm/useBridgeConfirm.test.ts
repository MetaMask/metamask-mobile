import { act, waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useBridgeConfirm } from './index';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import Routes from '../../../../../constants/navigation/Routes';
import { isHardwareAccount } from '../../../../../util/address';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
} from '../../../HardwareWallet/Swaps/HardwareWalletsSwaps.state';
import {
  type PostTradeBottomSheetParams,
  PostTradeStatus,
} from '../../components/PostTradeBottomSheet/PostTradeBottomSheet.types';
import { mockBridgeReducerState } from '../../_mocks_/bridgeReducerState';
import type { BridgeToken } from '../../types';
import type { RootState } from '../../../../../reducers';
import { KnownCaipNamespace } from '@metamask/utils';

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

const mockResolvePostTradePrompt = jest.fn();
jest.mock(
  '../../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/usePostTradePromptResolver',
  () => ({
    usePostTradePromptResolver: () => mockResolvePostTradePrompt,
  }),
);

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
    jest.mocked(isHardwareAccount).mockReturnValue(false);
    mockResolvePostTradePrompt.mockReturnValue({ kind: 'none' });
    mockSubmitBridgeTx.mockResolvedValue({
      id: 'tx-meta-id',
      hash: '0xabc',
      status: 'submitted',
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

    it('forwards the quote fetched with custom slippage unchanged', async () => {
      const customSlippageQuote = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          slippage: 3.5,
        },
      };
      const { result } = renderHook({
        ...defaultParams,
        activeQuote: customSlippageQuote,
      });

      await act(async () => {
        await result.current();
      });

      expect(mockSubmitBridgeTx).toHaveBeenCalledWith({
        quoteResponse: customSlippageQuote,
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
          sourceAmount: mockQuoteWithMetadata.quote.src?.normalizedAmount,
          destAmount: mockQuoteWithMetadata.quote.dest?.normalizedAmount,
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

    it('keeps the slippage override after successful submission', async () => {
      const state = {
        bridge: {
          ...mockBridgeReducerState,
          slippage: '3.5',
          isSlippageUserOverride: true,
        },
      };
      const { result, store } = renderHook(defaultParams, state);

      await act(async () => {
        await result.current();
      });

      expect((store.getState() as RootState).bridge.slippage).toBe('3.5');
      expect(
        (store.getState() as RootState).bridge.isSlippageUserOverride,
      ).toBe(true);
    });
  });

  describe('hardware wallet submissions', () => {
    it('navigates to hardware wallets progress view without calling submitBridgeTx', async () => {
      jest.mocked(isHardwareAccount).mockReturnValue(true);
      const { result } = renderHook({
        ...defaultParams,
        activeQuote: {
          ...mockQuoteWithMetadata,
          approval: { raw_data_hex: '0xabc' } as never,
        },
      });

      await act(async () => {
        await result.current();
      });

      const sourceAmount = mockQuoteWithMetadata.sentAmount;
      const destAmount = mockQuoteWithMetadata.toTokenAmount;
      if (!sourceAmount || !destAmount) {
        throw new Error('Mock quote is missing token amounts');
      }

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.BRIDGE.ROOT,
        expect.objectContaining({
          screen: Routes.BRIDGE.HARDWARE_WALLETS_SWAPS,
          params: expect.objectContaining({
            submissionParams: expect.objectContaining({
              postTradeModalParams: expect.objectContaining({
                sourceAmount: sourceAmount.amount,
                destAmount: destAmount.amount,
              }),
            }),
          }),
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });

    it('sets Waiting status for hardware wallet submissions', async () => {
      jest.mocked(isHardwareAccount).mockReturnValue(true);
      const { result, store } = renderHook();

      await act(async () => {
        await result.current();
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
          approval: { raw_data_hex: '0xabc' } as never,
        },
      });

      await act(async () => {
        await result.current();
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
        await result.current();
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

    it('shows NO recipient for same-chain swaps whose quote lacks an ultimate recipient (never the aggregator router)', async () => {
      jest.mocked(isHardwareAccount).mockReturnValue(true);
      const ROUTER = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
      const activeQuote = {
        ...mockQuoteWithMetadata,
        namespace: KnownCaipNamespace.Eip155,
        chainId: 'eip155:1' as const,
        quote: {
          ...mockQuoteWithMetadata.quote,
          src: { ...mockQuoteWithMetadata.quote.src, normalizedAmount: '10' },
          dest: {
            ...mockQuoteWithMetadata.quote.dest,
            normalizedAmount: '9.9',
          },
        },
        trade: {
          chainId: 1,
          from: WALLET_ADDRESS,
          to: ROUTER,
          value: '0x0',
          data: '0x',
          gasLimit: 21000,
        } as const,
      };
      const { result, store } = renderHook(
        {
          ...defaultParams,
          activeQuote,
        } as unknown as Parameters<typeof useBridgeConfirm>[0],
        {
          bridge: {
            ...mockBridgeReducerState,
            sourceToken: {
              ...mockBridgeReducerState.sourceToken,
              chainId: '0x1',
            },
            destToken: { ...mockBridgeReducerState.destToken, chainId: '0x1' },
          },
        },
      );

      await act(async () => {
        await result.current();
      });

      const steps = (store.getState() as RootState).bridge.hardwareWalletsSwaps
        .steps;
      const swapStep = steps.find(
        (candidate) =>
          candidate.kind === HardwareWalletsSwapsStepKind.Transaction,
      );
      expect(swapStep?.address).toBeUndefined();
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

    afterEach(() => {
      jest.restoreAllMocks();
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
          sourceAmount: mockQuoteWithMetadata.quote.src?.normalizedAmount,
          destAmount: mockQuoteWithMetadata.quote.dest?.normalizedAmount,
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

  describe('social Create post context', () => {
    const PEPE_ADDRESS = '0x6982508145454ce325ddbe47a25d4ec3d2311933';
    const WALLET_COUNT_KEY = {
      address: WALLET_ADDRESS,
      product: 'swaps',
    };
    const SHARE_SHEET_PROMPT = {
      kind: 'share_sheet',
      countKey: WALLET_COUNT_KEY,
    };
    const ETH_ON_ETHEREUM: BridgeToken = {
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      image: 'https://example.com/image.png',
      name: 'Ethereum',
      symbol: 'ETH',
      balance: '1.0',
      balanceFiat: '$2000',
      chainId: '0x1',
    };
    const PEPE_ON_ETHEREUM: BridgeToken = {
      address: PEPE_ADDRESS,
      decimals: 18,
      image: 'https://example.com/pepe.png',
      name: 'Pepe',
      symbol: 'PEPE',
      balance: '0',
      balanceFiat: '$0',
      chainId: '0x1',
    };
    const PEPE_ON_BASE: BridgeToken = {
      ...PEPE_ON_ETHEREUM,
      chainId: '0x2105',
    };

    const quoteWithSourceUsd = (
      usd: string | undefined,
    ): typeof mockQuoteWithMetadata =>
      ({
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          src: { ...mockQuoteWithMetadata.quote.src, usd },
        },
      }) as typeof mockQuoteWithMetadata;

    const stateWithTokens = (
      sourceToken: BridgeToken,
      destToken: BridgeToken,
    ): { bridge: typeof mockBridgeReducerState } => ({
      bridge: { ...mockBridgeReducerState, sourceToken, destToken },
    });

    const getPostTradeModalParams = ():
      | PostTradeBottomSheetParams
      | undefined => {
      const call = mockNavigate.mock.calls.find(
        ([route, options]) =>
          route === Routes.BRIDGE.MODALS.ROOT &&
          options?.screen === Routes.BRIDGE.MODALS.POST_TRADE_MODAL,
      );
      return call?.[1]?.params;
    };

    it('passes the swap context to the sheet for an eligible buy on the same chain', async () => {
      mockResolvePostTradePrompt.mockReturnValue(SHARE_SHEET_PROMPT);
      const { result } = renderHook(
        { ...defaultParams, activeQuote: quoteWithSourceUsd('25') },
        stateWithTokens(ETH_ON_ETHEREUM, PEPE_ON_ETHEREUM),
      );

      await act(async () => {
        await result.current();
      });

      expect(mockResolvePostTradePrompt).toHaveBeenCalledWith('swaps');
      expect(getPostTradeModalParams()).toMatchObject({
        status: PostTradeStatus.InProgress,
        transactionHash: '0xabc',
        socialPostTrade: {
          countKey: WALLET_COUNT_KEY,
          tradeInFlightChain: 'ethereum',
          txHash: 'submitted',
          preview: {
            tokenSymbol: 'PEPE',
            tokenAddress: PEPE_ADDRESS,
            chain: 'ethereum',
            side: 'buy',
            costLabel: '$25.00',
          },
        },
      });
    });

    it('uses the destination hash for a bridged buy', async () => {
      mockResolvePostTradePrompt.mockReturnValue(SHARE_SHEET_PROMPT);
      const { result } = renderHook(
        { ...defaultParams, activeQuote: quoteWithSourceUsd('25') },
        stateWithTokens(ETH_ON_ETHEREUM, PEPE_ON_BASE),
      );

      await act(async () => {
        await result.current();
      });

      expect(getPostTradeModalParams()?.socialPostTrade).toMatchObject({
        tradeInFlightChain: 'base',
        txHash: 'destination',
      });
    });

    it.each([
      ['none', { kind: 'none' }],
      ['claim_sheet', { kind: 'claim_sheet' }],
      ['post_to_feed_toast', { kind: 'post_to_feed_toast' }],
    ])(
      'omits the swap context when the prompt is %s',
      async (_label, prompt) => {
        mockResolvePostTradePrompt.mockReturnValue(prompt);
        const { result } = renderHook(
          { ...defaultParams, activeQuote: quoteWithSourceUsd('25') },
          stateWithTokens(ETH_ON_ETHEREUM, PEPE_ON_ETHEREUM),
        );

        await act(async () => {
          await result.current();
        });

        expect(getPostTradeModalParams()?.status).toBe(
          PostTradeStatus.InProgress,
        );
        expect(getPostTradeModalParams()?.socialPostTrade).toBeUndefined();
      },
    );

    it.each([
      ['below the $10 minimum', '9.99'],
      ['missing', undefined],
    ])(
      'omits the swap context when the sold USD value is %s',
      async (_label, usd) => {
        mockResolvePostTradePrompt.mockReturnValue(SHARE_SHEET_PROMPT);
        const { result } = renderHook(
          { ...defaultParams, activeQuote: quoteWithSourceUsd(usd) },
          stateWithTokens(ETH_ON_ETHEREUM, PEPE_ON_ETHEREUM),
        );

        await act(async () => {
          await result.current();
        });

        expect(getPostTradeModalParams()?.socialPostTrade).toBeUndefined();
      },
    );

    it('omits the swap context when the submission fails', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      mockSubmitBridgeTx.mockRejectedValue(new Error('Network error'));
      mockResolvePostTradePrompt.mockReturnValue(SHARE_SHEET_PROMPT);
      const { result } = renderHook(
        { ...defaultParams, activeQuote: quoteWithSourceUsd('25') },
        stateWithTokens(ETH_ON_ETHEREUM, PEPE_ON_ETHEREUM),
      );

      await act(async () => {
        await result.current();
      });

      expect(getPostTradeModalParams()).toMatchObject({
        status: PostTradeStatus.Failed,
      });
      expect(getPostTradeModalParams()?.socialPostTrade).toBeUndefined();
    });

    it('does not pass the swap context on the hardware wallet path yet', async () => {
      jest.mocked(isHardwareAccount).mockReturnValue(true);
      mockResolvePostTradePrompt.mockReturnValue(SHARE_SHEET_PROMPT);
      const { result } = renderHook(
        { ...defaultParams, activeQuote: quoteWithSourceUsd('25') },
        stateWithTokens(ETH_ON_ETHEREUM, PEPE_ON_ETHEREUM),
      );

      await act(async () => {
        await result.current();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.BRIDGE.ROOT,
        expect.objectContaining({
          screen: Routes.BRIDGE.HARDWARE_WALLETS_SWAPS,
        }),
      );
      const navigation = mockNavigate.mock.calls.find(
        ([route]) => route === Routes.BRIDGE.ROOT,
      );
      expect(
        navigation?.[1]?.params?.submissionParams?.postTradeModalParams,
      ).not.toHaveProperty('socialPostTrade');
    });
  });
});
