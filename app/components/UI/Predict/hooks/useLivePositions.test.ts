import { renderHook } from '@testing-library/react-native';
import { useLivePositions } from './useLivePositions';
import { useLiveMarketPrices } from './useLiveMarketPrices';
import { PredictPosition, PredictPositionStatus, PriceUpdate } from '../types';

jest.mock('./useLiveMarketPrices');

const createMockPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'position-1',
  providerId: 'polymarket',
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

describe('useLivePositions', () => {
  const mockUseLiveMarketPrices = useLiveMarketPrices as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
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

      renderHook(() => useLivePositions(positions));

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(
        ['token-1', 'token-2'],
        { enabled: true },
      );
    });

    it('disables subscription when positions array is empty', () => {
      renderHook(() => useLivePositions([]));

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith([], {
        enabled: false,
      });
    });

    it('disables subscription when enabled option is false', () => {
      const positions = [createMockPosition()];

      renderHook(() => useLivePositions(positions, { enabled: false }));

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(['token-1'], {
        enabled: false,
      });
    });

    it('passes enabled true when positions exist and enabled is not specified', () => {
      const positions = [createMockPosition()];

      renderHook(() => useLivePositions(positions));

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(['token-1'], {
        enabled: true,
      });
    });
  });

  describe('live position calculation', () => {
    it('returns original positions when no price updates are available', () => {
      const positions = [createMockPosition({ currentValue: 100, cashPnl: 0 })];
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map(),
        isConnected: true,
        lastUpdateTime: null,
      });

      const { result } = renderHook(() => useLivePositions(positions));

      expect(result.current.livePositions[0].currentValue).toBe(100);
      expect(result.current.livePositions[0].cashPnl).toBe(0);
    });

    it('calculates currentValue as size multiplied by bestBid', () => {
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

      const { result } = renderHook(() => useLivePositions([position]));

      expect(result.current.livePositions[0].currentValue).toBe(120);
    });

    it('calculates cashPnl as currentValue minus initialValue', () => {
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

      const { result } = renderHook(() => useLivePositions([position]));

      expect(result.current.livePositions[0].cashPnl).toBe(20);
    });

    it('calculates percentPnl correctly for positive gains', () => {
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

      const { result } = renderHook(() => useLivePositions([position]));

      expect(result.current.livePositions[0].percentPnl).toBe(20);
    });

    it('calculates percentPnl correctly for negative losses', () => {
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

      const { result } = renderHook(() => useLivePositions([position]));

      expect(result.current.livePositions[0].currentValue).toBe(80);
      expect(result.current.livePositions[0].cashPnl).toBe(-20);
      expect(result.current.livePositions[0].percentPnl).toBe(-20);
    });

    it('returns zero percentPnl when initialValue is zero', () => {
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

      const { result } = renderHook(() => useLivePositions([position]));

      expect(result.current.livePositions[0].percentPnl).toBe(0);
    });

    it('updates price field with bestBid value', () => {
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

      const { result } = renderHook(() => useLivePositions([position]));

      expect(result.current.livePositions[0].price).toBe(0.65);
    });
  });

  describe('multiple positions', () => {
    it('updates only positions with matching price updates', () => {
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

      const { result } = renderHook(() => useLivePositions(positions));

      expect(result.current.livePositions[0].currentValue).toBe(70);
      expect(result.current.livePositions[0].cashPnl).toBe(20);
      expect(result.current.livePositions[1].currentValue).toBe(100);
      expect(result.current.livePositions[1].cashPnl).toBe(0);
    });

    it('updates all positions when all have price updates', () => {
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

      const { result } = renderHook(() => useLivePositions(positions));

      expect(result.current.livePositions[0].currentValue).toBe(60);
      expect(result.current.livePositions[1].currentValue).toBe(160);
    });
  });

  describe('connection status', () => {
    it('returns isConnected from useLiveMarketPrices', () => {
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map(),
        isConnected: true,
        lastUpdateTime: null,
      });

      const { result } = renderHook(() => useLivePositions([]));

      expect(result.current.isConnected).toBe(true);
    });

    it('returns false for isConnected when disconnected', () => {
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map(),
        isConnected: false,
        lastUpdateTime: null,
      });

      const { result } = renderHook(() => useLivePositions([]));

      expect(result.current.isConnected).toBe(false);
    });

    it('returns lastUpdateTime from useLiveMarketPrices', () => {
      const timestamp = 1704067200000;
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map(),
        isConnected: true,
        lastUpdateTime: timestamp,
      });

      const { result } = renderHook(() => useLivePositions([]));

      expect(result.current.lastUpdateTime).toBe(timestamp);
    });

    it('returns null lastUpdateTime when no updates received', () => {
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map(),
        isConnected: true,
        lastUpdateTime: null,
      });

      const { result } = renderHook(() => useLivePositions([]));

      expect(result.current.lastUpdateTime).toBeNull();
    });
  });

  describe('empty state', () => {
    it('returns empty array for empty positions input', () => {
      const { result } = renderHook(() => useLivePositions([]));

      expect(result.current.livePositions).toEqual([]);
    });

    it('preserves position order in output', () => {
      const positions = [
        createMockPosition({ id: 'first', outcomeTokenId: 'token-1' }),
        createMockPosition({ id: 'second', outcomeTokenId: 'token-2' }),
        createMockPosition({ id: 'third', outcomeTokenId: 'token-3' }),
      ];

      const { result } = renderHook(() => useLivePositions(positions));

      expect(result.current.livePositions[0].id).toBe('first');
      expect(result.current.livePositions[1].id).toBe('second');
      expect(result.current.livePositions[2].id).toBe('third');
    });
  });

  describe('position data preservation', () => {
    it('preserves all original position fields not related to value calculation', () => {
      const position = createMockPosition({
        id: 'test-id',
        providerId: 'test-provider',
        marketId: 'test-market',
        outcomeId: 'test-outcome',
        outcome: 'Test Outcome',
        title: 'Test Title',
        icon: 'test-icon',
        status: PredictPositionStatus.OPEN,
        claimable: true,
        endDate: '2025-06-15',
        negRisk: true,
      });
      const priceUpdate = createMockPriceUpdate({ tokenId: 'token-1' });
      mockUseLiveMarketPrices.mockReturnValue({
        prices: new Map([['token-1', priceUpdate]]),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { result } = renderHook(() => useLivePositions([position]));

      const livePosition = result.current.livePositions[0];
      expect(livePosition.id).toBe('test-id');
      expect(livePosition.providerId).toBe('test-provider');
      expect(livePosition.marketId).toBe('test-market');
      expect(livePosition.outcomeId).toBe('test-outcome');
      expect(livePosition.outcome).toBe('Test Outcome');
      expect(livePosition.title).toBe('Test Title');
      expect(livePosition.icon).toBe('test-icon');
      expect(livePosition.status).toBe(PredictPositionStatus.OPEN);
      expect(livePosition.claimable).toBe(true);
      expect(livePosition.endDate).toBe('2025-06-15');
      expect(livePosition.negRisk).toBe(true);
    });
  });
});
