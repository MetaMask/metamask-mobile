import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictLivePositions } from './usePredictLivePositions';
import { useLiveMarketPrices } from './useLiveMarketPrices';
import { PredictPosition, PredictPositionStatus, PriceUpdate } from '../types';
import { predictQueries } from '../queries';

import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
jest.mock('./useLiveMarketPrices');
const mockUseIsFocused = jest.fn(() => true);
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockUseIsFocused(),
}));

const MOCK_ADDRESS = '0x1234567890123456789012345678901234567890';

const createMockPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'position-1',
  providerId: POLYMARKET_PROVIDER_ID,
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcome: 'Yes',
  outcomeTokenId: 'token-1',
  currentValue: 100,
  title: 'Test Position',
  icon: 'icon-url',
  amount: 10,
  price: 0.5,
  status: PredictPositionStatus.OPEN,
  size: 200,
  outcomeIndex: 0,
  percentPnl: 0,
  cashPnl: 0,
  claimable: false,
  initialValue: 100,
  avgPrice: 0.5,
  endDate: '2025-12-31',
  ...overrides,
});

const createMockPriceUpdate = (
  overrides: Partial<PriceUpdate> = {},
): PriceUpdate => ({
  tokenId: 'token-1',
  price: 0.6,
  bestBid: 0.59,
  bestAsk: 0.61,
  ...overrides,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper, queryClient };
};

const renderLivePositionsHook = (
  positions: PredictPosition[],
  options?: Parameters<typeof usePredictLivePositions>[1],
  cachedPositions?: PredictPosition[],
) => {
  const { Wrapper, queryClient } = createWrapper();
  if (cachedPositions) {
    queryClient.setQueryData(
      predictQueries.positions.keys.byAddress(MOCK_ADDRESS),
      cachedPositions,
    );
  }
  const renderResult = renderHook(
    () => usePredictLivePositions(positions, options),
    {
      wrapper: Wrapper,
    },
  );

  return {
    ...renderResult,
    queryClient,
  };
};

describe('usePredictLivePositions', () => {
  const mockUseLiveMarketPrices = useLiveMarketPrices as jest.Mock;

  const getCachedPositions = (queryClient: QueryClient) =>
    queryClient.getQueryData<PredictPosition[]>(
      predictQueries.positions.keys.byAddress(MOCK_ADDRESS),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsFocused.mockReturnValue(true);
    mockUseLiveMarketPrices.mockReturnValue({
      prices: new Map(),
      isConnected: false,
      lastUpdateTime: null,
    });
  });

  describe('subscription management', () => {
    it('subscribes to market prices with position token IDs', () => {
      const positions = [
        createMockPosition({ outcomeTokenId: 'token-1' }),
        createMockPosition({ id: 'position-2', outcomeTokenId: 'token-2' }),
      ];

      renderLivePositionsHook(positions);

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(
        ['token-1', 'token-2'],
        { enabled: true },
      );
    });

    it('disables subscription when positions array is empty', () => {
      renderLivePositionsHook([]);

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith([], {
        enabled: false,
      });
    });

    it('disables subscription when enabled option is false', () => {
      const positions = [createMockPosition()];

      renderLivePositionsHook(positions, { enabled: false });

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(['token-1'], {
        enabled: false,
      });
    });

    it('passes enabled true when positions exist and enabled is not specified', () => {
      const positions = [createMockPosition()];

      renderLivePositionsHook(positions);

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(['token-1'], {
        enabled: true,
      });
    });

    it('skips claimable positions when building live subscriptions', () => {
      const positions = [createMockPosition({ claimable: true })];

      renderLivePositionsHook(positions);

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith([], {
        enabled: false,
      });
    });

    it('disables subscription when the screen is not focused', () => {
      mockUseIsFocused.mockReturnValue(false);
      const positions = [createMockPosition()];

      renderLivePositionsHook(positions);

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(['token-1'], {
        enabled: false,
      });
    });
  });

  describe('live position calculation', () => {
    it('preserves cached positions when no price updates are available', async () => {
      const positions = [createMockPosition({ currentValue: 100, cashPnl: 0 })];
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map(),
        isConnected: true,
        lastUpdateTime: null,
      });

      const { queryClient } = renderLivePositionsHook(
        positions,
        { cacheAddress: MOCK_ADDRESS },
        positions,
      );

      await waitFor(() => {
        expect(getCachedPositions(queryClient)).toBe(positions);
      });
    });

    it('calculates currentValue as size multiplied by bestBid', async () => {
      const position = createMockPosition({
        outcomeTokenId: 'token-1',
        size: 200,
        initialValue: 100,
      });
      const priceUpdate = createMockPriceUpdate({
        tokenId: 'token-1',
        bestBid: 0.6,
      });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([['token-1', priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { queryClient } = renderLivePositionsHook(
        [position],
        { cacheAddress: MOCK_ADDRESS },
        [position],
      );

      await waitFor(() => {
        const cached = getCachedPositions(queryClient);
        expect(cached?.[0].currentValue).toBe(120);
      });
    });

    it('calculates cashPnl as currentValue minus initialValue', async () => {
      const position = createMockPosition({
        outcomeTokenId: 'token-1',
        size: 200,
        initialValue: 100,
      });
      const priceUpdate = createMockPriceUpdate({
        tokenId: 'token-1',
        bestBid: 0.6,
      });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([['token-1', priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { queryClient } = renderLivePositionsHook(
        [position],
        { cacheAddress: MOCK_ADDRESS },
        [position],
      );

      await waitFor(() => {
        const cached = getCachedPositions(queryClient);
        expect(cached?.[0].cashPnl).toBe(20);
      });
    });

    it('calculates percentPnl correctly for positive gains', async () => {
      const position = createMockPosition({
        outcomeTokenId: 'token-1',
        size: 200,
        initialValue: 100,
      });
      const priceUpdate = createMockPriceUpdate({
        tokenId: 'token-1',
        bestBid: 0.6,
      });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([['token-1', priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { queryClient } = renderLivePositionsHook(
        [position],
        { cacheAddress: MOCK_ADDRESS },
        [position],
      );

      await waitFor(() => {
        const cached = getCachedPositions(queryClient);
        expect(cached?.[0].percentPnl).toBe(20);
      });
    });

    it('calculates percentPnl correctly for negative losses', async () => {
      const position = createMockPosition({
        outcomeTokenId: 'token-1',
        size: 200,
        initialValue: 100,
      });
      const priceUpdate = createMockPriceUpdate({
        tokenId: 'token-1',
        bestBid: 0.4,
      });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([['token-1', priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { queryClient } = renderLivePositionsHook(
        [position],
        { cacheAddress: MOCK_ADDRESS },
        [position],
      );

      await waitFor(() => {
        const cached = getCachedPositions(queryClient);
        expect(cached?.[0].currentValue).toBe(80);
        expect(cached?.[0].cashPnl).toBe(-20);
        expect(cached?.[0].percentPnl).toBe(-20);
      });
    });

    it('returns zero percentPnl when initialValue is zero', async () => {
      const position = createMockPosition({
        outcomeTokenId: 'token-1',
        size: 200,
        initialValue: 0,
      });
      const priceUpdate = createMockPriceUpdate({
        tokenId: 'token-1',
        bestBid: 0.5,
      });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([['token-1', priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { queryClient } = renderLivePositionsHook(
        [position],
        { cacheAddress: MOCK_ADDRESS },
        [position],
      );

      await waitFor(() => {
        const cached = getCachedPositions(queryClient);
        expect(cached?.[0].percentPnl).toBe(0);
      });
    });

    it('updates price field with bestBid value', async () => {
      const position = createMockPosition({
        outcomeTokenId: 'token-1',
        price: 0.5,
      });
      const priceUpdate = createMockPriceUpdate({
        tokenId: 'token-1',
        bestBid: 0.65,
      });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([['token-1', priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { queryClient } = renderLivePositionsHook(
        [position],
        { cacheAddress: MOCK_ADDRESS },
        [position],
      );

      await waitFor(() => {
        const cached = getCachedPositions(queryClient);
        expect(cached?.[0].price).toBe(0.65);
      });
    });
  });

  describe('multiple positions', () => {
    it('updates only positions with matching price updates', async () => {
      const positions = [
        createMockPosition({
          id: 'position-1',
          outcomeTokenId: 'token-1',
          size: 100,
          initialValue: 50,
          currentValue: 50,
        }),
        createMockPosition({
          id: 'position-2',
          outcomeTokenId: 'token-2',
          size: 200,
          initialValue: 100,
          currentValue: 100,
        }),
      ];
      const priceUpdate = createMockPriceUpdate({
        tokenId: 'token-1',
        bestBid: 0.7,
      });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([['token-1', priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { queryClient } = renderLivePositionsHook(
        positions,
        { cacheAddress: MOCK_ADDRESS },
        positions,
      );

      await waitFor(() => {
        const cached = getCachedPositions(queryClient);
        expect(cached?.[0].currentValue).toBe(70);
        expect(cached?.[0].cashPnl).toBe(20);
        expect(cached?.[1].currentValue).toBe(100);
        expect(cached?.[1].cashPnl).toBe(0);
      });
    });

    it('updates all positions when all have price updates', async () => {
      const positions = [
        createMockPosition({
          id: 'position-1',
          outcomeTokenId: 'token-1',
          size: 100,
          initialValue: 50,
        }),
        createMockPosition({
          id: 'position-2',
          outcomeTokenId: 'token-2',
          size: 200,
          initialValue: 100,
        }),
      ];
      const pricesMap = new Map([
        [
          'token-1',
          createMockPriceUpdate({ tokenId: 'token-1', bestBid: 0.6 }),
        ],
        [
          'token-2',
          createMockPriceUpdate({ tokenId: 'token-2', bestBid: 0.8 }),
        ],
      ]);
      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { queryClient } = renderLivePositionsHook(
        positions,
        { cacheAddress: MOCK_ADDRESS },
        positions,
      );

      await waitFor(() => {
        const cached = getCachedPositions(queryClient);
        expect(cached?.[0].currentValue).toBe(60);
        expect(cached?.[1].currentValue).toBe(160);
      });
    });
  });

  describe('cache synchronization', () => {
    it('syncs live values into the address cache for passed active positions', async () => {
      const activePosition = createMockPosition({
        id: 'active-position',
        currentValue: 100,
        cashPnl: 0,
        percentPnl: 0,
      });
      const untouchedPosition = createMockPosition({
        id: 'untouched-position',
        outcomeTokenId: 'token-2',
        currentValue: 55,
        cashPnl: 5,
        percentPnl: 10,
      });
      const priceUpdate = createMockPriceUpdate({
        tokenId: activePosition.outcomeTokenId,
        bestBid: 0.6,
      });

      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([[activePosition.outcomeTokenId, priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { queryClient } = renderLivePositionsHook(
        [activePosition],
        {
          cacheAddress: MOCK_ADDRESS,
        },
        [activePosition, untouchedPosition],
      );

      await waitFor(() => {
        expect(getCachedPositions(queryClient)).toEqual([
          expect.objectContaining({
            id: activePosition.id,
            currentValue: 120,
            cashPnl: 20,
            percentPnl: 20,
            price: 0.6,
          }),
          untouchedPosition,
        ]);
      });
    });

    it('ignores claimable positions when syncing cache', async () => {
      const claimablePosition = createMockPosition({
        id: 'claimable-position',
        claimable: true,
        currentValue: 80,
        cashPnl: 30,
        percentPnl: 60,
      });
      const { queryClient } = renderLivePositionsHook(
        [claimablePosition],
        {
          cacheAddress: MOCK_ADDRESS,
        },
        [claimablePosition],
      );

      await waitFor(() => {
        expect(getCachedPositions(queryClient)).toEqual([claimablePosition]);
      });
    });

    it('does not rewrite cache when live values are unchanged', async () => {
      const livePosition = createMockPosition({
        currentValue: 120,
        cashPnl: 20,
        percentPnl: 20,
        price: 0.6,
      });
      const priceUpdate = createMockPriceUpdate({
        tokenId: livePosition.outcomeTokenId,
        bestBid: 0.6,
      });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([[livePosition.outcomeTokenId, priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const cachedPositions = [livePosition];
      const { queryClient } = renderLivePositionsHook(
        [livePosition],
        {
          cacheAddress: MOCK_ADDRESS,
        },
        cachedPositions,
      );

      await waitFor(() => {
        expect(getCachedPositions(queryClient)).toBe(cachedPositions);
      });
    });

    it('disables cache sync when enabled is false', async () => {
      const activePosition = createMockPosition({
        currentValue: 100,
        cashPnl: 0,
        percentPnl: 0,
      });
      const priceUpdate = createMockPriceUpdate({
        tokenId: activePosition.outcomeTokenId,
        bestBid: 0.6,
      });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([[activePosition.outcomeTokenId, priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const cachedPositions = [activePosition];
      const { queryClient } = renderLivePositionsHook(
        [activePosition],
        {
          enabled: false,
          cacheAddress: MOCK_ADDRESS,
        },
        cachedPositions,
      );

      await waitFor(() => {
        expect(getCachedPositions(queryClient)).toBe(cachedPositions);
      });
    });

    it('disables cache sync when the screen is not focused', async () => {
      mockUseIsFocused.mockReturnValue(false);
      const activePosition = createMockPosition({
        currentValue: 100,
        cashPnl: 0,
        percentPnl: 0,
      });
      const priceUpdate = createMockPriceUpdate({
        tokenId: activePosition.outcomeTokenId,
        bestBid: 0.6,
      });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([[activePosition.outcomeTokenId, priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const cachedPositions = [activePosition];
      const { queryClient } = renderLivePositionsHook(
        [activePosition],
        {
          cacheAddress: MOCK_ADDRESS,
        },
        cachedPositions,
      );

      await waitFor(() => {
        expect(getCachedPositions(queryClient)).toBe(cachedPositions);
      });
    });

    it('disables cache sync when cacheAddress is missing', async () => {
      const activePosition = createMockPosition({
        currentValue: 100,
        cashPnl: 0,
        percentPnl: 0,
      });
      const priceUpdate = createMockPriceUpdate({
        tokenId: activePosition.outcomeTokenId,
        bestBid: 0.6,
      });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([[activePosition.outcomeTokenId, priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const cachedPositions = [activePosition];
      const { queryClient } = renderLivePositionsHook(
        [activePosition],
        undefined,
        cachedPositions,
      );

      await waitFor(() => {
        expect(getCachedPositions(queryClient)).toBe(cachedPositions);
      });
    });
  });

  describe('empty state', () => {
    it('preserves position order in cache output', async () => {
      const positions = [
        createMockPosition({
          id: 'first',
          outcomeTokenId: 'token-1',
          size: 100,
          initialValue: 50,
        }),
        createMockPosition({
          id: 'second',
          outcomeTokenId: 'token-2',
          size: 200,
          initialValue: 100,
        }),
        createMockPosition({
          id: 'third',
          outcomeTokenId: 'token-3',
          size: 300,
          initialValue: 150,
        }),
      ];
      const pricesMap = new Map([
        [
          'token-1',
          createMockPriceUpdate({ tokenId: 'token-1', bestBid: 0.6 }),
        ],
        [
          'token-2',
          createMockPriceUpdate({ tokenId: 'token-2', bestBid: 0.7 }),
        ],
        [
          'token-3',
          createMockPriceUpdate({ tokenId: 'token-3', bestBid: 0.8 }),
        ],
      ]);
      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { queryClient } = renderLivePositionsHook(
        positions,
        { cacheAddress: MOCK_ADDRESS },
        positions,
      );

      await waitFor(() => {
        const cached = getCachedPositions(queryClient);
        expect(cached?.[0].id).toBe('first');
        expect(cached?.[1].id).toBe('second');
        expect(cached?.[2].id).toBe('third');
      });
    });
  });
});
