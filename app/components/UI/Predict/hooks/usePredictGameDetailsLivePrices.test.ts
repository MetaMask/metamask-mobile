import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { GetPriceResponse, PriceQuery, PriceUpdate } from '../types';
import { useLiveMarketPrices } from './useLiveMarketPrices';
import { usePredictGameDetailsLivePrices } from './usePredictGameDetailsLivePrices';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPrices: jest.fn(),
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

describe('usePredictGameDetailsLivePrices', () => {
  const mockGetPrices = Engine.context.PredictController.getPrices as jest.Mock;
  const mockUseLiveMarketPrices = useLiveMarketPrices as jest.Mock;
  let livePrices: Map<string, PriceUpdate>;
  let capturedOnPriceUpdates: ((updates: PriceUpdate[]) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPrices.mockResolvedValue(createPriceResponse({}));
    livePrices = new Map();
    capturedOnPriceUpdates = undefined;
    mockUseLiveMarketPrices.mockImplementation((_, options) => {
      capturedOnPriceUpdates = options?.onPriceUpdates;
      return {
        prices: livePrices,
        getPrice: (tokenId: string) => livePrices.get(tokenId),
        isConnected: true,
        lastUpdateTime: null,
      };
    });
  });

  it('warms newly visible tokens and delegates sorted token IDs to live prices', async () => {
    const tokenOneQuery = createPriceQuery('token-1');
    const tokenTwoQuery = createPriceQuery('token-2');
    const { rerender } = renderHook(
      ({ queries }) => usePredictGameDetailsLivePrices(queries),
      { initialProps: { queries: [tokenTwoQuery, tokenOneQuery] } },
    );

    expect(mockGetPrices).toHaveBeenCalledWith({
      queries: [tokenOneQuery, tokenTwoQuery],
    });
    expect(mockUseLiveMarketPrices).toHaveBeenLastCalledWith(
      ['token-1', 'token-2'],
      expect.objectContaining({
        enabled: true,
        onPriceUpdates: expect.any(Function),
      }),
    );

    await waitFor(() => {
      expect(mockGetPrices).toHaveBeenCalledTimes(1);
    });
    mockGetPrices.mockClear();

    rerender({ queries: [tokenOneQuery, tokenTwoQuery] });

    expect(mockGetPrices).not.toHaveBeenCalled();
  });

  it('skips warmup while disabled but keeps live price delegation disabled', () => {
    renderHook(() =>
      usePredictGameDetailsLivePrices([createPriceQuery('token-1')], {
        enabled: false,
      }),
    );

    expect(mockGetPrices).not.toHaveBeenCalled();
    expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(
      ['token-1'],
      expect.objectContaining({ enabled: false }),
    );
  });

  it('normalizes REST warmup prices into the returned price map', async () => {
    mockGetPrices.mockResolvedValue(
      createPriceResponse({ 'token-1': { buy: 0.62, sell: 0.61 } }),
    );
    const { result } = renderHook(() =>
      usePredictGameDetailsLivePrices([createPriceQuery('token-1')]),
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

  it('lets WebSocket updates win over stale REST warmup results', async () => {
    let resolveWarmup: (value: GetPriceResponse) => void = jest.fn();
    mockGetPrices.mockReturnValue(
      new Promise<GetPriceResponse>((resolve) => {
        resolveWarmup = resolve;
      }),
    );
    const { result } = renderHook(() =>
      usePredictGameDetailsLivePrices([createPriceQuery('token-1')]),
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

    expect(result.current.getPrice('token-1')).toEqual(update);
  });

  it('prunes inactive tokens from merged prices', () => {
    const { result, rerender } = renderHook(
      ({ queries }) => usePredictGameDetailsLivePrices(queries),
      { initialProps: { queries: [createPriceQuery('token-1')] } },
    );

    act(() => {
      const update = createLivePrice('token-1', { price: 0.74 });
      livePrices.set('token-1', update);
      capturedOnPriceUpdates?.([update]);
    });
    rerender({ queries: [] });

    expect(result.current.prices.size).toBe(0);
  });

  it('logs warmup fetch errors without throwing', async () => {
    const fetchError = new Error('price fetch failed');
    mockGetPrices.mockRejectedValueOnce(fetchError);

    renderHook(() =>
      usePredictGameDetailsLivePrices([createPriceQuery('token-1')]),
    );
    await flushPromises();

    expect(DevLogger.log).toHaveBeenCalledWith(
      'usePredictGameDetailsLivePrices: Error fetching prices',
      fetchError,
    );
  });
});
