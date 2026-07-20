import { act, renderHook, waitFor } from '@testing-library/react-native';
import { FeatureId } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import {
  useQuickBuyQuotes,
  QUICK_BUY_QUOTE_DEBOUNCE_MS,
} from './hooks/useQuickBuyQuotes';
import {
  isQuoteStreamingEnabled,
  streamQuickBuyQuotes,
} from './utils/streamQuickBuyQuotes';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import {
  selectDestAddress,
  selectIsSlippageUserOverride,
  selectSlippage,
} from '../../../../../../core/redux/slices/bridge';
import {
  selectGasIncludedQuoteParams,
  selectSourceWalletAddress,
} from '../../../../../../selectors/bridge';
import { selectSocialAIQuickBuyStreamQuotesEnabled } from '../../../../../../selectors/featureFlagController/socialLeaderboard';
import Logger from '../../../../../../util/Logger';

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  shallowEqual: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        fetchQuotes: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(() => false),
  },
}));

jest.mock('../../../../../../selectors/featureFlagController', () => ({
  selectRemoteFeatureFlags: jest.fn(() => ({ bridgeConfig: {} })),
}));

jest.mock(
  '../../../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialAIQuickBuyStreamQuotesEnabled: jest.fn(() => true),
  }),
);

jest.mock('../../../../../../core/redux/slices/bridge', () => ({
  selectDestAddress: jest.fn(),
  selectIsSlippageUserOverride: jest.fn(() => false),
  selectSlippage: jest.fn(),
  selectBridgeFeatureFlags: jest.fn(() => ({
    maxRefreshCount: 5,
    refreshRate: 30000,
    chains: {},
  })),
}));

jest.mock('../../../../../../selectors/bridge', () => ({
  selectGasIncludedQuoteParams: jest.fn(),
  selectSourceWalletAddress: jest.fn(),
}));

jest.mock('./utils/streamQuickBuyQuotes', () => ({
  isQuoteStreamingEnabled: jest.fn(() => false),
  streamQuickBuyQuotes: jest.fn(),
}));

const mockTrack = jest.fn();
jest.mock('../../../analytics', () => {
  const actual = jest.requireActual('../../../analytics');
  return {
    ...actual,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

const mockSelectBridgeQuotesBase = jest.fn();

jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    selectBridgeQuotes: (...args: unknown[]) =>
      mockSelectBridgeQuotesBase(...args),
  };
});

const fetchQuotesMock = Engine.context.BridgeController
  .fetchQuotes as jest.Mock;
const useSelectorMock = useSelector as jest.Mock;
const isQuoteStreamingEnabledMock = isQuoteStreamingEnabled as jest.Mock;
const streamQuickBuyQuotesMock = streamQuickBuyQuotes as jest.Mock;
const isStreamQuotesFlagEnabledMock =
  selectSocialAIQuickBuyStreamQuotesEnabled as unknown as jest.Mock;

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
    srcChainId: 1,
    destChainId: 8453,
    srcTokenAmount: '10000000000000000',
    destTokenAmount: '5000000',
    minDestTokenAmount: '4950000',
  },
  estimatedProcessingTimeInSeconds: 30,
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

describe('useQuickBuyQuotes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    setupSelectors();
    // The QuickBuy stream flag is on by default, so `isQuoteStreamingEnabled`
    // (bridge SSE) is the effective switch: default to the one-shot path; the
    // streaming suite opts in explicitly.
    isStreamQuotesFlagEnabledMock.mockReturnValue(true);
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
    const { result } = renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: undefined,
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
    );

    expect(result.current.activeQuote).toBeUndefined();
    expect(result.current.isQuoteLoading).toBe(false);
    expect(result.current.isNoQuotesAvailable).toBe(false);
    expect(fetchQuotesMock).not.toHaveBeenCalled();
  });

  it('debounces fetchQuotes calls', async () => {
    fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

    renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
    );

    expect(fetchQuotesMock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
  });

  it('fetches immediately without waiting for the debounce when immediateFetchToken increments', async () => {
    fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

    const { rerender } = renderHook(
      ({ token }: { token: number }) =>
        useQuickBuyQuotes(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
            immediateFetchToken: token,
          }),
        ),
      { initialProps: { token: 0 } },
    );

    fetchQuotesMock.mockClear();

    rerender({ token: 1 });

    await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
  });

  it('keeps typed input debounced when immediateFetchToken is unchanged', async () => {
    fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

    const { rerender } = renderHook(
      ({ amount }: { amount: string }) =>
        useQuickBuyQuotes(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: amount,
            immediateFetchToken: 0,
          }),
        ),
      { initialProps: { amount: '0.001' } },
    );

    fetchQuotesMock.mockClear();

    rerender({ amount: '0.002' });

    expect(fetchQuotesMock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
  });

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
      ({ token, amount }: { token: number; amount: string }) =>
        useQuickBuyQuotes(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: amount,
            immediateFetchToken: token,
          }),
        ),
      { initialProps: { token: 0, amount: '0.001' } },
    );

    rerender({ token: 1, amount: '0.001' });
    rerender({ token: 2, amount: '0.002' });

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

    renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
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

    renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
          analyticsContext: { source: 'asset_details' },
        }),
      ),
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

    const { result } = renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
    );

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    await waitFor(() => expect(result.current.isNoQuotesAvailable).toBe(true));
    expect(result.current.isQuoteLoading).toBe(false);
  });

  it('captures fetch errors in quoteFetchError', async () => {
    fetchQuotesMock.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
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

    renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
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
    renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken({ decimals: 18 }),
          destToken: createDestToken(),
          sourceTokenAmount: '0',
        }),
      ),
    );

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    expect(fetchQuotesMock).not.toHaveBeenCalled();
  });

  it('skips fetching when sourceToken.decimals is undefined', () => {
    renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken({
            decimals: undefined as unknown as number,
          }),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
    );

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    expect(fetchQuotesMock).not.toHaveBeenCalled();
  });

  it('fires REQUESTED and RECEIVED analytics events when analyticsContext is complete', async () => {
    const fetched = createFetchedQuote();
    fetchQuotesMock.mockResolvedValue([fetched]);

    renderHook(() =>
      useQuickBuyQuotes(
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
      ),
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

    renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
          analyticsContext: {
            traderAddress: '0xTRADER',
            caip19: 'eip155:8453/erc20:0xDEST',
          },
        }),
      ),
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

    renderHook(() =>
      useQuickBuyQuotes(
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
      ),
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

    const { result } = renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
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
    expect(callsAfterFailedAutoRefresh).toBeGreaterThan(callsAfterInitialFetch);

    // Failed fetch must not trigger an immediate retry (delay = 0 loop).
    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(fetchQuotesMock.mock.calls.length).toBe(callsAfterFailedAutoRefresh);
  });

  it('enriches raw quotes via selectBridgeQuotes and returns the recommended quote', async () => {
    const fetched = createFetchedQuote();
    const enriched = { ...fetched, gasFee: { effective: { amount: '0.001' } } };
    fetchQuotesMock.mockResolvedValue([fetched]);
    mockSelectBridgeQuotesBase.mockImplementation((controllerFields) =>
      controllerFields.quotes.length > 0
        ? { sortedQuotes: [enriched], recommendedQuote: enriched }
        : { sortedQuotes: [], recommendedQuote: null },
    );

    const { result } = renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
    );

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    await waitFor(() => expect(result.current.activeQuote).toBe(enriched));
    expect(result.current.isActiveQuoteForCurrentTokenPair).toBe(true);
    expect(result.current.destTokenAmount).toBe('5');

    const lastCallFields = mockSelectBridgeQuotesBase.mock.calls.at(-1)?.[0];
    expect(lastCallFields.quotes).toEqual([fetched]);
  });

  it('flags isQuoteRequestStale when slippage changes after quotes settle, then clears once refetched', async () => {
    fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

    const { result, rerender } = renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
    );

    await act(async () => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });
    await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
    expect(result.current.isQuoteRequestStale).toBe(false);

    (selectSlippage as unknown as jest.Mock).mockReturnValue('1');
    rerender({});

    expect(result.current.isQuoteRequestStale).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    await waitFor(() => expect(result.current.isQuoteRequestStale).toBe(false));
  });

  it('flags isQuoteRequestStale when the destination address changes', async () => {
    fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

    const { result, rerender } = renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
    );

    await act(async () => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });
    await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
    expect(result.current.isQuoteRequestStale).toBe(false);

    (selectDestAddress as unknown as jest.Mock).mockReturnValue('0xRECIPIENT');
    rerender({});

    expect(result.current.isQuoteRequestStale).toBe(true);
  });

  it('does not refetch or mark quotes stale when backend slippage hydrates', async () => {
    (selectSlippage as unknown as jest.Mock).mockReturnValue(undefined);
    fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

    const { result, rerender } = renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
    );

    await act(async () => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });
    await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
    expect(result.current.isQuoteRequestStale).toBe(false);

    (selectSlippage as unknown as jest.Mock).mockReturnValue('2');
    rerender({});

    await act(async () => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    expect(fetchQuotesMock).toHaveBeenCalledTimes(1);
    expect(result.current.isQuoteRequestStale).toBe(false);
  });

  it('uses the one-shot fetch when the QuickBuy stream flag is off, even with bridge SSE on', async () => {
    isStreamQuotesFlagEnabledMock.mockReturnValue(false);
    isQuoteStreamingEnabledMock.mockReturnValue(true);
    fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

    renderHook(() =>
      useQuickBuyQuotes(
        quotesParams({
          sourceToken: createSourceToken(),
          destToken: createDestToken(),
          sourceTokenAmount: '0.001',
        }),
      ),
    );

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
    expect(streamQuickBuyQuotesMock).not.toHaveBeenCalled();
  });

  describe('streaming path', () => {
    const streamedQuote = (requestId: string) => {
      const quote = createFetchedQuote();
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

      const { result } = renderHook(() =>
        useQuickBuyQuotes(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        ),
      );

      await act(async () => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() => expect(result.current.sortedQuotes).toHaveLength(2));
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

      const { result } = renderHook(() =>
        useQuickBuyQuotes(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        ),
      );

      await act(async () => {
        jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
      });

      await waitFor(() => expect(result.current.sortedQuotes).toHaveLength(1));
    });

    it('flags isNoQuotesAvailable when the stream ends with no quotes', async () => {
      streamQuickBuyQuotesMock.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useQuickBuyQuotes(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        ),
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

      const { result } = renderHook(() =>
        useQuickBuyQuotes(
          quotesParams({
            sourceToken: createSourceToken(),
            destToken: createDestToken(),
            sourceTokenAmount: '0.001',
          }),
        ),
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
      const { result } = renderHook(() => useQuickBuyQuotes(stableParams));

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
      const { result } = renderHook(() => useQuickBuyQuotes(stableParams));

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
      const { result } = renderHook(() => useQuickBuyQuotes(stableParams));

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
  });
});
