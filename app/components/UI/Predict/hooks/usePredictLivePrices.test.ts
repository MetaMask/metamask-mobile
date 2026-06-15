import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { GetPriceResponse, PriceQuery, PriceUpdate } from '../types';
import { usePredictLivePrices } from './usePredictLivePrices';
import { useLiveMarketPrices } from './useLiveMarketPrices';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPrices: jest.fn(),
      subscribeToMarketPrices: jest.fn(),
      getConnectionStatus: jest.fn(),
    },
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

jest.mock('./useLiveMarketPrices', () => ({
  useLiveMarketPrices: jest.fn(),
}));

const createPriceQuery = (
  outcomeTokenId: string,
  overrides: Partial<PriceQuery> = {},
): PriceQuery => ({
  marketId: `market-${outcomeTokenId}`,
  outcomeId: `outcome-${outcomeTokenId}`,
  outcomeTokenId,
  ...overrides,
});

const createPriceResponse = (
  tokenPrices: Record<string, { buy: number; sell: number }>,
): GetPriceResponse => ({
  providerId: 'polymarket',
  results: Object.entries(tokenPrices).map(([tokenId, entry]) => ({
    marketId: `market-${tokenId}`,
    outcomeId: `outcome-${tokenId}`,
    outcomeTokenId: tokenId,
    entry,
  })),
});

const createLivePrice = (
  tokenId: string,
  overrides: Partial<PriceUpdate> = {},
): PriceUpdate => ({
  tokenId,
  price: 0.7,
  bestBid: 0.69,
  bestAsk: 0.71,
  ...overrides,
});

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('usePredictLivePrices', () => {
  const mockGetPrices = Engine.context.PredictController.getPrices as jest.Mock;
  const mockUseLiveMarketPrices = useLiveMarketPrices as jest.Mock;
  let livePrices: Map<string, PriceUpdate>;
  let liveConnected: boolean;
  let capturedOnPriceUpdates: ((updates: PriceUpdate[]) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetPrices.mockResolvedValue(createPriceResponse({}));
    livePrices = new Map();
    liveConnected = true;
    capturedOnPriceUpdates = undefined;
    mockUseLiveMarketPrices.mockImplementation((_, options) => {
      capturedOnPriceUpdates = options?.onPriceUpdates;
      return {
        prices: livePrices,
        getPrice: (tokenId: string) => livePrices.get(tokenId),
        isConnected: liveConnected,
        lastUpdateTime: null,
      };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('warm-up fetching', () => {
    it('starts warm-up fetch and delegates token IDs to live market prices', () => {
      const queries = [createPriceQuery('token-1')];

      renderHook(() => usePredictLivePrices(queries));

      expect(mockGetPrices).toHaveBeenCalledWith({ queries });
      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(
        ['token-1'],
        expect.objectContaining({
          enabled: true,
          onPriceUpdates: expect.any(Function),
        }),
      );
    });

    it('fetches only newly visible queries when token IDs change', async () => {
      const tokenOneQuery = createPriceQuery('token-1');
      const tokenTwoQuery = createPriceQuery('token-2');
      const { rerender } = renderHook(
        ({ queries }) => usePredictLivePrices(queries),
        { initialProps: { queries: [tokenOneQuery] } },
      );

      await waitFor(() => {
        expect(mockGetPrices).toHaveBeenCalledTimes(1);
      });
      mockGetPrices.mockClear();

      rerender({ queries: [tokenOneQuery, tokenTwoQuery] });

      expect(mockGetPrices).toHaveBeenCalledWith({
        queries: [tokenTwoQuery],
      });
    });

    it('normalizes REST warm-up prices into live price map entries', async () => {
      mockGetPrices.mockResolvedValue(
        createPriceResponse({ 'token-1': { buy: 0.62, sell: 0.61 } }),
      );
      const { result } = renderHook(() =>
        usePredictLivePrices([createPriceQuery('token-1')]),
      );

      await waitFor(() => {
        expect(result.current.getPrice('token-1')).toEqual({
          tokenId: 'token-1',
          price: 0.62,
          bestBid: 0.61,
          bestAsk: 0.62,
        });
      });

      expect(result.current.priceVersion).toBe(1);
    });

    it('skips warm-up fetch when disabled', () => {
      renderHook(() =>
        usePredictLivePrices([createPriceQuery('token-1')], {
          enabled: false,
        }),
      );

      expect(mockGetPrices).not.toHaveBeenCalled();
      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(
        ['token-1'],
        expect.objectContaining({ enabled: false }),
      );
    });
  });

  describe('subscription management', () => {
    it('delegates visible token IDs to useLiveMarketPrices', () => {
      renderHook(() =>
        usePredictLivePrices([
          createPriceQuery('token-2'),
          createPriceQuery('token-1'),
        ]),
      );

      expect(mockUseLiveMarketPrices).toHaveBeenLastCalledWith(
        ['token-1', 'token-2'],
        expect.objectContaining({
          enabled: true,
          onPriceUpdates: expect.any(Function),
        }),
      );
    });

    it('delegates changed token IDs to useLiveMarketPrices', () => {
      const { rerender } = renderHook(
        ({ queries }) => usePredictLivePrices(queries),
        { initialProps: { queries: [createPriceQuery('token-1')] } },
      );

      rerender({ queries: [createPriceQuery('token-2')] });

      expect(mockUseLiveMarketPrices).toHaveBeenLastCalledWith(
        ['token-2'],
        expect.objectContaining({
          enabled: true,
          onPriceUpdates: expect.any(Function),
        }),
      );
    });

    it('does not resubscribe when query order changes without token changes', () => {
      const { rerender } = renderHook(
        ({ queries }) => usePredictLivePrices(queries),
        {
          initialProps: {
            queries: [createPriceQuery('token-2'), createPriceQuery('token-1')],
          },
        },
      );

      rerender({
        queries: [createPriceQuery('token-1'), createPriceQuery('token-2')],
      });

      expect(mockUseLiveMarketPrices).toHaveBeenLastCalledWith(
        ['token-1', 'token-2'],
        expect.objectContaining({ enabled: true }),
      );
    });
  });

  describe('price updates', () => {
    it('updates prices from websocket callbacks', () => {
      const { result } = renderHook(() =>
        usePredictLivePrices([createPriceQuery('token-1')]),
      );
      const update = createLivePrice('token-1', {
        price: 0.81,
        bestBid: 0.8,
        bestAsk: 0.82,
      });

      act(() => {
        livePrices.set('token-1', update);
        capturedOnPriceUpdates?.([update]);
      });

      expect(result.current.getPrice('token-1')).toEqual({
        tokenId: 'token-1',
        price: 0.81,
        bestBid: 0.8,
        bestAsk: 0.82,
      });
      expect(result.current.priceVersion).toBe(1);
    });

    it('removes inactive live prices from the merged price map', () => {
      const { result, rerender } = renderHook(
        ({ queries }) => usePredictLivePrices(queries),
        { initialProps: { queries: [createPriceQuery('token-1')] } },
      );
      act(() => {
        const update = createLivePrice('token-1', { price: 0.74 });
        livePrices.set('token-1', update);
        capturedOnPriceUpdates?.([update]);
      });

      rerender({ queries: [] });

      expect(mockUseLiveMarketPrices).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ enabled: false }),
      );
      expect(result.current.prices.size).toBe(0);
    });

    it('ignores REST warm-up results when websocket updates arrive first', async () => {
      let resolveWarmup: (value: GetPriceResponse) => void = jest.fn();
      mockGetPrices.mockReturnValue(
        new Promise<GetPriceResponse>((resolve) => {
          resolveWarmup = resolve;
        }),
      );
      const { result } = renderHook(() =>
        usePredictLivePrices([createPriceQuery('token-1')]),
      );
      const update = createLivePrice('token-1', {
        price: 0.82,
        bestBid: 0.81,
        bestAsk: 0.83,
      });
      act(() => {
        livePrices.set('token-1', update);
        capturedOnPriceUpdates?.([update]);
      });

      await act(async () => {
        resolveWarmup(
          createPriceResponse({ 'token-1': { buy: 0.61, sell: 0.6 } }),
        );
      });
      await flushPromises();

      expect(result.current.getPrice('token-1')).toEqual({
        tokenId: 'token-1',
        price: 0.82,
        bestBid: 0.81,
        bestAsk: 0.83,
      });
    });
  });

  describe('connection status', () => {
    it('reflects market websocket connection status', () => {
      liveConnected = false;

      const { result } = renderHook(() =>
        usePredictLivePrices([createPriceQuery('token-1')]),
      );

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('error logging', () => {
    it('logs warm-up fetch errors without clearing retained prices', async () => {
      const fetchError = new Error('price fetch failed');
      mockGetPrices
        .mockResolvedValueOnce(
          createPriceResponse({ 'token-1': { buy: 0.7, sell: 0.69 } }),
        )
        .mockRejectedValueOnce(fetchError);
      const { result, rerender } = renderHook(
        ({ queries }) => usePredictLivePrices(queries),
        { initialProps: { queries: [createPriceQuery('token-1')] } },
      );
      await waitFor(() => {
        expect(result.current.getPrice('token-1')?.price).toBe(0.7);
      });

      rerender({ queries: [createPriceQuery('token-2')] });
      await flushPromises();

      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePredictLivePrices: Error fetching prices',
        fetchError,
      );
      expect(result.current.getPrice('token-1')?.price).toBe(0.7);
    });
  });
});
