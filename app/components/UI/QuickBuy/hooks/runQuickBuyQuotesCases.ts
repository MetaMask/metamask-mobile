import { act, waitFor } from '@testing-library/react-native';
import {
  FeatureId,
  mergeQuoteMetadata,
  toQuoteResponseV2,
  type GenericQuoteRequest,
} from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  QUICK_BUY_QUOTE_DEBOUNCE_MS,
  type useQuickBuyQuotes,
  type UseQuickBuyQuotesResult,
} from './useQuickBuyQuotes';
import {
  isQuoteStreamingEnabled,
  streamQuickBuyQuotes,
} from '../utils/streamQuickBuyQuotes';
import type { BridgeToken } from '../../Bridge/types';
import {
  selectBridgeFeatureFlags,
  selectDestAddress,
  selectIsSlippageUserOverride,
  selectSlippage,
} from '../../../../core/redux/slices/bridge';
import {
  selectGasIncludedQuoteParams,
  selectSourceWalletAddress,
} from '../../../../selectors/bridge';
import Logger from '../../../../util/Logger';
import { buildGenericQuoteRequest } from '../../Bridge/hooks/useSwapQuotes/utils';

const useSelectorMock = useSelector as jest.Mock;
const isQuoteStreamingEnabledMock = isQuoteStreamingEnabled as jest.Mock;
const streamQuickBuyQuotesMock = streamQuickBuyQuotes as jest.Mock;
const mockTrack = (
  jest.requireMock('../../../Views/SocialLeaderboard/analytics') as {
    mockTrack: jest.Mock;
  }
).mockTrack;
const mockSelectBridgeQuotesBase = (
  jest.requireMock('@metamask/bridge-controller') as {
    mockSelectBridgeQuotesBase: jest.Mock;
  }
).mockSelectBridgeQuotesBase;
const mockBuildGenericQuoteRequest =
  buildGenericQuoteRequest as jest.MockedFunction<
    typeof buildGenericQuoteRequest
  >;

const createSourceToken = (overrides: Partial<BridgeToken> = {}): BridgeToken =>
  ({
    address: '0x0000000000000000000000000000000000000000',
    chainId: '0x1',
    decimals: 18,
    symbol: 'ETH',
    name: 'Ethereum',
    balance: '1.0',
    ...overrides,
  }) as BridgeToken;

const createDestToken = (overrides: Partial<BridgeToken> = {}): BridgeToken =>
  ({
    address: '0xDEST',
    chainId: '0x2105',
    decimals: 6,
    symbol: 'TEST',
    name: 'Test Token',
    balance: '0',
    ...overrides,
  }) as BridgeToken;

const createFetchedQuote = (overrides = {}) => ({
  quote: {
    requestId: 'quote-1',
    bridgeId: 'quote-1',
    bridges: ['provider-1'],
    steps: [],
    srcAsset: {
      address: '0x0000000000000000000000000000000000000000',
      chainId: 1,
      assetId: 'eip155:1/slip44:60',
      symbol: 'ETH',
      decimals: 18,
      name: 'Ethereum',
    },
    destAsset: {
      address: '0xDEST',
      chainId: 8453,
      assetId: 'eip155:8453/erc20:0xDEST',
      symbol: 'TEST',
      decimals: 6,
      name: 'Test',
    },
    feeData: {
      metabridge: {
        amount: '0',
        asset: {
          address: '0x0000000000000000000000000000000000000000',
          chainId: 1,
          assetId: 'eip155:1/slip44:60',
          symbol: 'ETH',
          decimals: 18,
          name: 'Ethereum',
        },
      },
    },
    srcChainId: 1,
    destChainId: 8453,
    srcTokenAmount: '10000000000000000',
    destTokenAmount: '5000000',
    minDestTokenAmount: '4950000',
  },
  estimatedProcessingTimeInSeconds: 30,
  trade: {
    chainId: 1,
    value: '0x0',
    data: '0x0',
    from: '0x0000000000000000000000000000000000000000',
    to: '0xDEST',
    gasLimit: 100,
  },
  ...overrides,
});

const mockRootState = {
  engine: {
    backgroundState: {
      BridgeController: { quotes: [] },
      GasFeeController: { gasFeeEstimatesByChainId: {} },
      MultichainAssetsRatesController: {},
      TokenRatesController: {},
      CurrencyRateController: {},
    },
  },
};

const setupSelectors = () => {
  (selectSlippage as unknown as jest.Mock).mockReturnValue('0.5');
  (selectDestAddress as unknown as jest.Mock).mockReturnValue(null);
  (selectSourceWalletAddress as unknown as jest.Mock).mockReturnValue(
    '0xWALLET',
  );
  (selectGasIncludedQuoteParams as unknown as jest.Mock).mockReturnValue({
    gasIncluded: false,
    gasIncluded7702: false,
  });

  useSelectorMock.mockImplementation((selector: (state: unknown) => unknown) =>
    selector(mockRootState),
  );
};

type QuickBuyQuotesParams = Parameters<typeof useQuickBuyQuotes>[0];

function quotesParams(params: QuickBuyQuotesParams): QuickBuyQuotesParams {
  return {
    ...params,
    analyticsContext: {
      source: 'leaderboard',
      ...params.analyticsContext,
    },
  };
}

export const runQuickBuyQuotesCases = ({
  name,
  renderHook,
  fetchQuotesMock,
}: {
  name: string;
  renderHook: (params: QuickBuyQuotesParams) => {
    result: { current: UseQuickBuyQuotesResult };
    rerender: (params: QuickBuyQuotesParams) => void;
    unmount: () => void;
  };
  fetchQuotesMock: jest.Mock;
}) => {
  describe(name, () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllMocks();
      setupSelectors();
      // `isQuoteStreamingEnabled` (bridge SSE) is the stream switch: default to
      // the one-shot path; the streaming suite opts in explicitly.
      isQuoteStreamingEnabledMock.mockReturnValue(false);
      mockSelectBridgeQuotesBase.mockReturnValue({
        sortedQuotes: [],
        recommendedQuote: null,
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns idle state when any required input is missing', () => {
      const { result } = renderHook(
        quotesParams({
          sourceToken: undefined,
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      expect(result.current.activeQuote).toBeUndefined();
      expect(result.current.isQuoteLoading).toBe(false);
      expect(result.current.isNoQuotesAvailable).toBe(false);
      expect(fetchQuotesMock).not.toHaveBeenCalled();
    });

    // Only a committed value (`immediateFetchToken` bump, e.g. slider release)
    // bypasses the debounce; mounting and typing both wait it out.
    it.each([
      {
        trigger: 'mounting',
        update: undefined,
        bypassesDebounce: false,
      },
      {
        trigger: 'incrementing immediateFetchToken',
        update: { amount: '0.001', token: 1 },
        bypassesDebounce: true,
      },
      {
        trigger: 'changing the typed amount',
        update: { amount: '0.002', token: 0 },
        bypassesDebounce: false,
      },
    ])(
      'fetches quotes when $trigger (bypasses debounce: $bypassesDebounce)',
      async ({ update, bypassesDebounce }) => {
        fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

        const { rerender } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
            immediateFetchToken: 0,
          }),
        );

        if (update) {
          fetchQuotesMock.mockClear();
          rerender(
            quotesParams({
              sourceToken: createSourceToken(),
              destToken: createDestToken(),
              sourceTokenAmount: update.amount,
              immediateFetchToken: update.token,
            }),
          );
        }

        if (bypassesDebounce) {
          // No timer advance: being called at all proves it did not debounce.
          expect(fetchQuotesMock).toHaveBeenCalledTimes(1);
          return;
        }

        expect(fetchQuotesMock).not.toHaveBeenCalled();

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
      },
    );

    it('aborts the in-flight request and applies only the latest when slides are committed in quick succession', async () => {
      const staleQuote = createFetchedQuote();
      staleQuote.quote.requestId = 'stale';
      const freshQuote = createFetchedQuote();
      freshQuote.quote.requestId = 'fresh';

      mockSelectBridgeQuotesBase.mockImplementation(
        (controllerFields: { quotes: unknown[] }) => ({
          sortedQuotes: controllerFields.quotes,
          recommendedQuote: controllerFields.quotes[0] ?? null,
        }),
      );

      let resolveStale: (value: unknown) => void = () => undefined;
      const stalePromise = new Promise((resolve) => {
        resolveStale = resolve;
      });
      fetchQuotesMock
        .mockReturnValueOnce(stalePromise)
        .mockResolvedValueOnce([freshQuote]);

      const { result, rerender } = renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
          immediateFetchToken: 0,
        }),
      );

      rerender(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
          immediateFetchToken: 1,
        }),
      );
      rerender(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.002',
          immediateFetchToken: 2,
        }),
      );

      await waitFor(() =>
        expect(result.current.activeQuote?.quote.requestId).toBe('fresh'),
      );

      expect(fetchQuotesMock).toHaveBeenCalledTimes(2);
      const firstRequestSignal = fetchQuotesMock.mock.calls[0][2];
      expect(firstRequestSignal.aborted).toBe(true);

      await act(async () => {
        resolveStale([staleQuote]);
        await Promise.resolve();
      });

      expect(result.current.activeQuote?.quote.requestId).toBe('fresh');
    });

    it('calls BridgeController.fetchQuotes with atomic source amount and slippage', async () => {
      fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

      renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalled());

      const [request] = fetchQuotesMock.mock.calls[0];
      expect(request).toMatchObject({
        walletAddress: '0xWALLET',
        slippage: 0.5,
        srcTokenAmount: '1000000000000000',
        gasIncluded: false,
        gasIncluded7702: false,
      });
      expect(fetchQuotesMock.mock.calls[0][1]).toBe(
        FeatureId.QUICK_BUY_FOLLOW_TRADING,
      );
    });

    it('passes QUICK_BUY_TOKEN_DETAILS FeatureId when source is asset_details', async () => {
      fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

      renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
          analyticsContext: { source: 'asset_details' },
        }),
      );

      act(() => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalled());

      expect(fetchQuotesMock.mock.calls[0][1]).toBe(
        FeatureId.QUICK_BUY_TOKEN_DETAILS,
      );
    });

    it('flags isNoQuotesAvailable when fetchQuotes returns an empty array', async () => {
      fetchQuotesMock.mockResolvedValue([]);

      const { result } = renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() =>
        expect(result.current.isNoQuotesAvailable).toBe(true),
      );
      expect(result.current.isQuoteLoading).toBe(false);
    });

    it('captures fetch errors in quoteFetchError', async () => {
      fetchQuotesMock.mockRejectedValue(new Error('boom'));

      const { result } = renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() => expect(result.current.quoteFetchError).toBe('boom'));
      expect(result.current.isQuoteLoading).toBe(false);
    });

    it('logs feature:social to Sentry when fetchQuotes fails', async () => {
      const fetchError = new Error('Network request failed');
      fetchQuotesMock.mockRejectedValue(fetchError);

      renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() => expect(Logger.error).toHaveBeenCalled());

      expect(Logger.error).toHaveBeenCalledWith(
        fetchError,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            surface: 'quick_buy',
            operation: 'fetch_quotes',
          }),
          extras: expect.objectContaining({
            message: 'Error fetching QuickBuy quotes at useQuickBuyQuotes',
          }),
        }),
      );
    });

    it('skips fetching when the atomic source amount normalizes to zero', () => {
      renderHook(
        quotesParams({
          sourceToken: createSourceToken({ decimals: 18 }),
          destToken: createDestToken(),
          sourceTokenAmount: '0',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      expect(fetchQuotesMock).not.toHaveBeenCalled();
    });

    it('skips fetching when sourceToken.decimals is undefined', () => {
      renderHook(
        quotesParams({
          sourceToken: createSourceToken({
            decimals: undefined as unknown as number,
          }),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      expect(fetchQuotesMock).not.toHaveBeenCalled();
    });

    it('fires REQUESTED and RECEIVED analytics events when analyticsContext is complete', async () => {
      const fetched = createFetchedQuote();
      fetchQuotesMock.mockResolvedValue([fetched]);

      renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
          analyticsContext: {
            traderAddress: '0xTRADER',
            caip19: 'eip155:8453/erc20:0xDEST',
            amountUsd: 50,
          },
        }),
      );

      act(() => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalled());

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_QUOTES_REQUESTED,
        expect.objectContaining({
          trader_address: '0xTRADER',
          caip19: 'eip155:8453/erc20:0xDEST',
          amount_usd: 50,
          pay_with_token: 'ETH',
        }),
      );

      await waitFor(() =>
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.SOCIAL_QUICK_BUY_QUOTES_RECEIVED,
          expect.objectContaining({
            trader_address: '0xTRADER',
            quote_count: 1,
          }),
        ),
      );
    });

    it('fires RECEIVED with quote_count 0 when analyticsContext is set and fetch errors', async () => {
      fetchQuotesMock.mockRejectedValue(new Error('network error'));

      renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
          analyticsContext: {
            traderAddress: '0xTRADER',
            caip19: 'eip155:8453/erc20:0xDEST',
          },
        }),
      );

      act(() => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() =>
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.SOCIAL_QUICK_BUY_QUOTES_RECEIVED,
          expect.objectContaining({ quote_count: 0 }),
        ),
      );
    });

    it('defaults amountUsd to 0 when analyticsContext.amountUsd is absent', async () => {
      fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

      renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
          analyticsContext: {
            traderAddress: '0xTRADER',
            caip19: 'eip155:8453/erc20:0xDEST',
            // amountUsd intentionally absent
          },
        }),
      );

      act(() => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() =>
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.SOCIAL_QUICK_BUY_QUOTES_REQUESTED,
          expect.objectContaining({ amount_usd: 0 }),
        ),
      );
    });

    it('waits the full refresh interval after a failed auto-refresh, not immediate retry', async () => {
      const fetched = createFetchedQuote();
      fetchQuotesMock
        .mockResolvedValueOnce([fetched])
        .mockRejectedValue(new Error('network error'));

      const { result } = renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });
      await waitFor(() => {
        expect(fetchQuotesMock).toHaveBeenCalledTimes(1);
        expect(result.current.refreshCount).toBe(1);
      });

      const refreshMs = result.current.quoteRefreshRateMs;
      const callsAfterInitialFetch = fetchQuotesMock.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(refreshMs);
        await Promise.resolve();
      });
      expect(result.current.quoteFetchError).toBe('network error');

      const callsAfterFailedAutoRefresh = fetchQuotesMock.mock.calls.length;
      expect(callsAfterFailedAutoRefresh).toBeGreaterThan(
        callsAfterInitialFetch,
      );

      // Failed fetch must not trigger an immediate retry (delay = 0 loop).
      await act(async () => {
        jest.advanceTimersByTime(1);
        await Promise.resolve();
      });
      expect(fetchQuotesMock.mock.calls.length).toBe(
        callsAfterFailedAutoRefresh,
      );
    });

    it('enriches raw quotes via selectBridgeQuotes and returns the recommended quote', async () => {
      const fetched = createFetchedQuote();
      const enriched = mergeQuoteMetadata(toQuoteResponseV2(fetched), {
        gasFee: { total: { amount: '0.001' } },
      });
      fetchQuotesMock.mockResolvedValue([fetched]);
      mockSelectBridgeQuotesBase.mockImplementation((controllerFields) =>
        controllerFields.quotes.length > 0
          ? {
              sortedQuotes: [enriched],
              recommendedQuote: enriched,
            }
          : { sortedQuotes: [], recommendedQuote: null },
      );

      const { result } = renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() => expect(result.current.activeQuote).toBe(enriched));
      expect(result.current.isActiveQuoteForCurrentTokenPair).toBe(true);
      expect(result.current.destTokenAmount).toBe('5');

      const lastCallFields = mockSelectBridgeQuotesBase.mock.calls.at(-1)?.[0];
      expect(lastCallFields.quotes).toEqual([toQuoteResponseV2(fetched)]);
    });

    it('flags isQuoteRequestStale when slippage changes after quotes settle, then clears once refetched', async () => {
      fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

      const { result, rerender } = renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });
      await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
      expect(result.current.isQuoteRequestStale).toBe(false);

      (selectSlippage as unknown as jest.Mock).mockReturnValue('1');
      rerender(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      expect(result.current.isQuoteRequestStale).toBe(true);

      await act(async () => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() =>
        expect(result.current.isQuoteRequestStale).toBe(false),
      );
    });

    it('flags isQuoteRequestStale when the destination address changes', async () => {
      fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

      const { result, rerender } = renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });
      await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
      expect(result.current.isQuoteRequestStale).toBe(false);

      (selectDestAddress as unknown as jest.Mock).mockReturnValue(
        '0xRECIPIENT',
      );
      rerender(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      expect(result.current.isQuoteRequestStale).toBe(true);
    });

    it('does not refetch or mark quotes stale when backend slippage hydrates', async () => {
      (selectSlippage as unknown as jest.Mock).mockReturnValue(undefined);
      fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

      const { result, rerender } = renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });
      await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
      expect(result.current.isQuoteRequestStale).toBe(false);

      (selectSlippage as unknown as jest.Mock).mockReturnValue('2');
      rerender(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      expect(fetchQuotesMock).toHaveBeenCalledTimes(1);
      expect(result.current.isQuoteRequestStale).toBe(false);
    });

    describe('streaming path', () => {
      const streamedQuote = (requestId: string) => {
        const quote = toQuoteResponseV2(createFetchedQuote());
        quote.quote.requestId = requestId;
        return quote;
      };

      interface StreamHandlers {
        onQuote: (quote: unknown) => void;
      }

      beforeEach(() => {
        isQuoteStreamingEnabledMock.mockReturnValue(true);
        // Pass the injected quotes straight through so sortedQuotes reflects the
        // accumulated stream and the first quote becomes the recommended one.
        mockSelectBridgeQuotesBase.mockImplementation(
          (controllerFields: { quotes: unknown[] }) => ({
            sortedQuotes: controllerFields.quotes,
            recommendedQuote: controllerFields.quotes[0] ?? null,
          }),
        );
      });

      it('accumulates streamed quotes and never calls the one-shot fetch', async () => {
        streamQuickBuyQuotesMock.mockImplementation(
          async (
            _params: unknown,
            _featureId: unknown,
            _signal: unknown,
            { onQuote }: StreamHandlers,
          ) => {
            onQuote(streamedQuote('r1'));
            onQuote(streamedQuote('r2'));
          },
        );

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        await act(async () => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() =>
          expect(result.current.sortedQuotes).toHaveLength(2),
        );
        expect(fetchQuotesMock).not.toHaveBeenCalled();
        expect(streamQuickBuyQuotesMock).toHaveBeenCalledTimes(1);
        expect(result.current.isQuoteLoading).toBe(false);
        expect(result.current.isNoQuotesAvailable).toBe(false);
        expect(result.current.refreshCount).toBe(1);
      });

      it('dedupes streamed quotes by requestId', async () => {
        streamQuickBuyQuotesMock.mockImplementation(
          async (
            _params: unknown,
            _featureId: unknown,
            _signal: unknown,
            { onQuote }: StreamHandlers,
          ) => {
            onQuote(streamedQuote('dup'));
            onQuote(streamedQuote('dup'));
          },
        );

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        await act(async () => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() =>
          expect(result.current.sortedQuotes).toHaveLength(1),
        );
      });

      it('flags isNoQuotesAvailable when the stream ends with no quotes', async () => {
        streamQuickBuyQuotesMock.mockResolvedValue(undefined);

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        await act(async () => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() =>
          expect(result.current.isNoQuotesAvailable).toBe(true),
        );
        expect(result.current.isQuoteLoading).toBe(false);
      });

      it('captures stream errors in quoteFetchError', async () => {
        streamQuickBuyQuotesMock.mockRejectedValue(new Error('stream boom'));

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        await act(async () => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() =>
          expect(result.current.quoteFetchError).toBe('stream boom'),
        );
        expect(result.current.isQuoteLoading).toBe(false);
      });

      it('keeps auto-refreshing indefinitely (refresh is never paused)', async () => {
        streamQuickBuyQuotesMock.mockImplementation(
          async (
            _params: unknown,
            _featureId: unknown,
            _signal: unknown,
            { onQuote }: StreamHandlers,
          ) => {
            onQuote(streamedQuote('r1'));
          },
        );

        // Stable params object: inline factories would create new token /
        // analyticsContext references each render, recreating fetchQuotes and
        // re-firing the reactive (non-refresh) fetch — which would confuse the
        // refresh-count assertions below.
        const stableParams = quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        });
        const { result } = renderHook(stableParams);

        await act(async () => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });
        await waitFor(() => expect(result.current.refreshCount).toBe(1));

        const callsAfterInitial = streamQuickBuyQuotesMock.mock.calls.length;
        await act(async () => {
          jest.advanceTimersByTime(result.current.quoteRefreshRateMs);
          await Promise.resolve();
        });

        // A full refresh interval after settling, the next fetch fires.
        expect(streamQuickBuyQuotesMock.mock.calls.length).toBeGreaterThan(
          callsAfterInitial,
        );
      });

      it('surfaces the cheapest quote as lower-cost quotes stream in', async () => {
        // Sort the injected quotes by ascending cost, like the real selector.
        mockSelectBridgeQuotesBase.mockImplementation(
          (controllerFields: { quotes: { cost?: number }[] }) => {
            const sortedQuotes = [...controllerFields.quotes].sort(
              (a, b) => (a.cost ?? 0) - (b.cost ?? 0),
            );
            return { sortedQuotes, recommendedQuote: sortedQuotes[0] ?? null };
          },
        );

        const withCost = (requestId: string, cost: number) => ({
          ...streamedQuote(requestId),
          cost,
        });

        let emit: (quote: unknown) => void = () => undefined;
        streamQuickBuyQuotesMock.mockImplementationOnce(
          async (
            _params: unknown,
            _featureId: unknown,
            _signal: unknown,
            { onQuote }: StreamHandlers,
          ) => {
            emit = onQuote;
            onQuote(withCost('expensive', 10));
            // Keep the stream open so the next quote still arrives mid-stream.
            await new Promise<void>(() => undefined);
          },
        );

        // Stable params so setState-driven re-renders don't recreate fetchQuotes
        // and re-fire the reactive fetch (which would abort this stream).
        const stableParams = quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        });
        const { result } = renderHook(stableParams);

        await act(async () => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });
        await waitFor(() =>
          expect(result.current.activeQuote?.quote.requestId).toBe('expensive'),
        );

        // A cheaper quote arrives while the stream is still open.
        await act(async () => {
          emit(withCost('cheap', 1));
          await Promise.resolve();
        });

        expect(result.current.activeQuote?.quote.requestId).toBe('cheap');
      });

      it('anchors the next auto-refresh on the stream close, not the fetch start', async () => {
        let closeFirstStream: () => void = () => undefined;
        streamQuickBuyQuotesMock.mockImplementationOnce(
          async (
            _params: unknown,
            _featureId: unknown,
            _signal: unknown,
            { onQuote }: StreamHandlers,
          ) => {
            onQuote(streamedQuote('r1'));
            await new Promise<void>((resolve) => {
              closeFirstStream = resolve;
            });
          },
        );

        // Stable params so setState-driven re-renders don't recreate fetchQuotes
        // and schedule extra fetches that would skew the call count.
        const stableParams = quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        });
        const { result } = renderHook(stableParams);

        await act(async () => {
          await jest.advanceTimersByTimeAsync(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });
        expect(streamQuickBuyQuotesMock).toHaveBeenCalledTimes(1);

        const refreshMs = result.current.quoteRefreshRateMs;

        // Stream stays open for 5s, then closes.
        await act(async () => {
          await jest.advanceTimersByTimeAsync(5000);
        });
        await act(async () => {
          closeFirstStream();
          await Promise.resolve();
        });

        // Start-anchored code would refetch a full interval after the fetch START
        // (5s after close); settle-anchored code waits a full interval from CLOSE.
        await act(async () => {
          await jest.advanceTimersByTimeAsync(refreshMs - 1);
        });
        expect(streamQuickBuyQuotesMock).toHaveBeenCalledTimes(1);

        await act(async () => {
          await jest.advanceTimersByTimeAsync(1);
        });
        expect(streamQuickBuyQuotesMock).toHaveBeenCalledTimes(2);
      });

      it('does not start a refresh while a stream is still in flight', async () => {
        streamQuickBuyQuotesMock.mockImplementation(
          async (
            _params: unknown,
            _featureId: unknown,
            _signal: unknown,
            { onQuote }: StreamHandlers,
          ) => {
            onQuote(streamedQuote('r1'));
            await new Promise<void>(() => undefined);
          },
        );

        const stableParams = quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        });
        const { result } = renderHook(stableParams);

        await act(async () => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });
        await waitFor(() => expect(result.current.activeQuote).toBeDefined());

        await act(async () => {
          jest.advanceTimersByTime(result.current.quoteRefreshRateMs);
          await Promise.resolve();
        });

        expect(streamQuickBuyQuotesMock).toHaveBeenCalledTimes(1);
      });

      it('ignores streamed quotes that arrive after the request is aborted', async () => {
        let emit: (quote: unknown) => void = () => undefined;
        streamQuickBuyQuotesMock.mockImplementationOnce(
          async (
            _params: unknown,
            _featureId: unknown,
            _signal: unknown,
            { onQuote }: StreamHandlers,
          ) => {
            emit = onQuote;
            onQuote(streamedQuote('r1'));
            await new Promise<void>(() => undefined);
          },
        );
        streamQuickBuyQuotesMock.mockResolvedValue(undefined);

        const { result, rerender } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
            immediateFetchToken: 0,
          }),
        );

        await act(async () => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });
        await waitFor(() =>
          expect(result.current.activeQuote?.quote.requestId).toBe('r1'),
        );

        rerender(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
            immediateFetchToken: 1,
          }),
        );

        await act(async () => {
          emit(streamedQuote('late'));
          await Promise.resolve();
        });

        expect(
          result.current.sortedQuotes.some(
            (quote) => quote.quote.requestId === 'late',
          ),
        ).toBe(false);
      });

      it('does not settle a stream that was aborted before it closed', async () => {
        let closeFirstStream: () => void = () => undefined;
        streamQuickBuyQuotesMock.mockImplementationOnce(
          async (
            _params: unknown,
            _featureId: unknown,
            _signal: unknown,
            { onQuote }: StreamHandlers,
          ) => {
            onQuote(streamedQuote('r1'));
            await new Promise<void>((resolve) => {
              closeFirstStream = resolve;
            });
          },
        );
        streamQuickBuyQuotesMock.mockResolvedValue(undefined);

        const { result, rerender } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
            immediateFetchToken: 0,
          }),
        );

        await act(async () => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });
        await waitFor(() =>
          expect(result.current.activeQuote?.quote.requestId).toBe('r1'),
        );

        rerender(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.002',
            immediateFetchToken: 1,
          }),
        );

        await waitFor(() => expect(result.current.refreshCount).toBe(1));

        await act(async () => {
          closeFirstStream();
          await Promise.resolve();
        });

        expect(result.current.refreshCount).toBe(1);
      });
    });

    describe('request guards', () => {
      it('skips fetching when the source amount cannot be converted to atomic units', () => {
        renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: {
              toString() {
                throw new Error('cannot convert amount');
              },
            } as unknown as string,
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        expect(fetchQuotesMock).not.toHaveBeenCalled();
      });

      it('skips fetching when the amount is a lone decimal point', () => {
        renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '.',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        expect(fetchQuotesMock).not.toHaveBeenCalled();
      });

      it('skips fetching when the wallet address is missing', () => {
        (selectSourceWalletAddress as unknown as jest.Mock).mockReturnValue(
          undefined,
        );

        renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        expect(fetchQuotesMock).not.toHaveBeenCalled();
      });

      it('skips fetching when destToken is missing', () => {
        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: undefined,
            sourceTokenAmount: '0.001',
          }),
        );

        expect(result.current.activeQuote).toBeUndefined();
        expect(fetchQuotesMock).not.toHaveBeenCalled();
      });

      it('skips fetching when sourceTokenAmount is missing', () => {
        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: undefined,
          }),
        );

        expect(result.current.activeQuote).toBeUndefined();
        expect(fetchQuotesMock).not.toHaveBeenCalled();
      });
    });

    describe('request shape', () => {
      it('omits slippage when the selector returns undefined', async () => {
        (selectSlippage as unknown as jest.Mock).mockReturnValue(undefined);
        fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

        renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalled());
        expect(fetchQuotesMock.mock.calls[0][0].slippage).toBeUndefined();
      });

      it('sends destWalletAddress when a recipient is set', async () => {
        (selectDestAddress as unknown as jest.Mock).mockReturnValue(
          '0xRECIPIENT',
        );
        fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

        renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalled());
        expect(fetchQuotesMock.mock.calls[0][0].destWalletAddress).toBe(
          '0xRECIPIENT',
        );
      });

      it('defaults destWalletAddress to the wallet when no recipient is set', async () => {
        fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

        renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalled());
        expect(fetchQuotesMock.mock.calls[0][0].destWalletAddress).toBe(
          '0xWALLET',
        );
      });

      it('defaults maxRefreshCount to 5 when the flag is omitted', () => {
        (selectBridgeFeatureFlags as unknown as jest.Mock).mockReturnValue({
          refreshRate: 30000,
          chains: {},
        });

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        expect(result.current.maxRefreshCount).toBe(5);
      });
    });

    describe('fetch errors', () => {
      it('stores a non-Error fetch failure as quoteFetchError', async () => {
        fetchQuotesMock.mockRejectedValue('network down');

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() =>
          expect(result.current.quoteFetchError).toBe('network down'),
        );
      });

      it('keeps quoteFetchError null when an aborted fetch later rejects', async () => {
        let rejectStale: (reason: unknown) => void = () => undefined;
        const stalePromise = new Promise((_, reject) => {
          rejectStale = reject;
        });
        fetchQuotesMock
          .mockReturnValueOnce(stalePromise)
          .mockResolvedValueOnce([createFetchedQuote()]);

        const { result, rerender } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
            immediateFetchToken: 1,
          }),
        );

        await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));

        rerender(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.002',
            immediateFetchToken: 2,
          }),
        );

        await act(async () => {
          rejectStale(new Error('aborted'));
          await Promise.resolve();
        });

        expect(result.current.quoteFetchError).toBeNull();
      });

      it('logs unknown chain ids when tokens omit chainId on fetch failure', async () => {
        const fetchError = new Error('boom');
        fetchQuotesMock.mockRejectedValue(fetchError);
        mockBuildGenericQuoteRequest.mockReturnValueOnce({
          srcTokenAddress: '0x0000000000000000000000000000000000000000',
          destTokenAddress: '0xDEST',
          srcTokenAmount: '1000000000000000',
          walletAddress: '0xWALLET',
          destWalletAddress: '0xWALLET',
          gasIncluded: false,
          gasIncluded7702: false,
          insufficientBal: false,
        } as GenericQuoteRequest);

        renderHook(
          quotesParams({
            sourceToken: createSourceToken({
              chainId: undefined as unknown as BridgeToken['chainId'],
            }),
            destToken: createDestToken({
              chainId: undefined as unknown as BridgeToken['chainId'],
            }),
            sourceTokenAmount: '0.001',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() =>
          expect(Logger.error).toHaveBeenCalledWith(
            fetchError,
            expect.objectContaining({
              tags: expect.objectContaining({
                sourceChainId: 'unknown',
                destChainId: 'unknown',
              }),
            }),
          ),
        );
      });
    });

    describe('quote metadata', () => {
      const settleRecommendedQuote = async () => {
        const fetched = createFetchedQuote();
        fetchQuotesMock.mockResolvedValue([fetched]);
        mockSelectBridgeQuotesBase.mockImplementation(
          (controllerFields: { quotes: unknown[] }) => ({
            sortedQuotes: controllerFields.quotes,
            recommendedQuote: controllerFields.quotes[0] ?? null,
          }),
        );

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() => expect(result.current.activeQuote).toBeDefined());
      };

      it('returns the recommended quote when gas fee estimates are missing', async () => {
        useSelectorMock.mockImplementation(
          (selector: (state: unknown) => unknown) =>
            selector({
              engine: {
                backgroundState: {
                  ...mockRootState.engine.backgroundState,
                  GasFeeController: {},
                },
              },
            }),
        );

        await settleRecommendedQuote();
      });

      it('returns the recommended quote when quoteRequest is an empty array', async () => {
        useSelectorMock.mockImplementation(
          (selector: (state: unknown) => unknown) =>
            selector({
              engine: {
                backgroundState: {
                  ...mockRootState.engine.backgroundState,
                  BridgeController: { quotes: [], quoteRequest: [] },
                },
              },
            }),
        );

        await settleRecommendedQuote();
      });

      it('returns the recommended quote when quoteRequest is a populated array', async () => {
        useSelectorMock.mockImplementation(
          (selector: (state: unknown) => unknown) =>
            selector({
              engine: {
                backgroundState: {
                  ...mockRootState.engine.backgroundState,
                  BridgeController: {
                    quotes: [],
                    quoteRequest: [{ srcChainId: 1 }],
                  },
                },
              },
            }),
        );

        await settleRecommendedQuote();
      });
    });

    describe('quote selection', () => {
      it('returns the quote matching selectedQuoteRequestId', async () => {
        const first = createFetchedQuote();
        first.quote.requestId = 'first';
        const second = createFetchedQuote();
        second.quote.requestId = 'second';
        fetchQuotesMock.mockResolvedValue([first, second]);
        mockSelectBridgeQuotesBase.mockImplementation(
          (controllerFields: { quotes: unknown[] }) => ({
            sortedQuotes: controllerFields.quotes,
            recommendedQuote: controllerFields.quotes[0] ?? null,
          }),
        );

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
            selectedQuoteRequestId: 'second',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() =>
          expect(result.current.activeQuote?.quote.requestId).toBe('second'),
        );
      });

      it('returns the recommended quote when selectedQuoteRequestId is missing from the batch', async () => {
        const fetched = createFetchedQuote();
        const enriched = toQuoteResponseV2(fetched);
        fetchQuotesMock.mockResolvedValue([fetched]);
        mockSelectBridgeQuotesBase.mockImplementation(
          (controllerFields: { quotes: unknown[] }) => ({
            sortedQuotes: controllerFields.quotes,
            recommendedQuote: controllerFields.quotes[0] ?? null,
          }),
        );

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
            selectedQuoteRequestId: 'missing',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() =>
          expect(result.current.activeQuote).toEqual(enriched),
        );
      });

      it('returns no active quote when the selected request id is unknown', async () => {
        fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);
        mockSelectBridgeQuotesBase.mockReturnValue({
          sortedQuotes: [],
          recommendedQuote: null,
        });

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
            selectedQuoteRequestId: 'missing',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalled());
        expect(result.current.activeQuote).toBeUndefined();
      });

      it('returns an empty sortedQuotes list when the selector omits them', () => {
        mockSelectBridgeQuotesBase.mockReturnValue({
          recommendedQuote: null,
        });

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        expect(result.current.sortedQuotes).toEqual([]);
      });

      it('leaves destTokenAmount unset when the active quote is for a different pair', async () => {
        const fetched = createFetchedQuote();
        fetchQuotesMock.mockResolvedValue([fetched]);
        mockSelectBridgeQuotesBase.mockReturnValue({
          sortedQuotes: [toQuoteResponseV2(fetched)],
          recommendedQuote: toQuoteResponseV2(fetched),
        });

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken({
              address: '0xOTHER',
              chainId: '0x89',
            }),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() => expect(result.current.activeQuote).toBeDefined());
        expect(result.current.destTokenAmount).toBeUndefined();
      });

      it('marks a Solana quote as matching the current token pair', async () => {
        const solana = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
        const srcAssetId = `${solana}/token:So11111111111111111111111111111111111111112`;
        const destAssetId = `${solana}/token:DestMint111111111111111111111111111111111`;
        const fetched = createFetchedQuote();
        const enriched = toQuoteResponseV2(fetched);
        enriched.chainId = solana;
        enriched.quote.src.asset.assetId = srcAssetId;
        enriched.quote.dest.asset.assetId = destAssetId;
        fetchQuotesMock.mockResolvedValue([fetched]);
        mockSelectBridgeQuotesBase.mockReturnValue({
          sortedQuotes: [enriched],
          recommendedQuote: enriched,
        });

        const { result } = renderHook(
          quotesParams({
            sourceToken: createSourceToken({
              address: srcAssetId,
              chainId: solana,
            }),
            destToken: createDestToken({
              address: destAssetId,
              chainId: solana,
            }),
            sourceTokenAmount: '0.001',
          }),
        );

        act(() => {
          jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
        });

        await waitFor(() =>
          expect(result.current.isActiveQuoteForCurrentTokenPair).toBe(true),
        );
      });
    });

    it('fetches immediately when refetchQuotes is called', async () => {
      fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

      const { result } = renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });
      await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));

      await act(async () => {
        result.current.refetchQuotes();
      });

      await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(2));
    });

    it('flags quotes stale on dest change when the user overrode slippage', async () => {
      (selectIsSlippageUserOverride as unknown as jest.Mock).mockReturnValue(
        true,
      );
      fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

      const { result, rerender } = renderHook(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      await act(async () => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });
      await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));

      (selectDestAddress as unknown as jest.Mock).mockReturnValue(
        '0xRECIPIENT',
      );
      rerender(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      );

      expect(result.current.isQuoteRequestStale).toBe(true);
    });
  });
};
