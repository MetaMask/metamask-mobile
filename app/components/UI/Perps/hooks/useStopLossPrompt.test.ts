import { renderHook, act } from '@testing-library/react-hooks';
import { useStopLossPrompt } from './useStopLossPrompt';
import type { Position } from '../controllers/types';
import { STOP_LOSS_PROMPT_CONFIG } from '../constants/perpsConfig';

// Mock timers for debounce testing
jest.useFakeTimers();

describe('useStopLossPrompt', () => {
  const createMockPosition = (overrides: Partial<Position> = {}): Position => ({
    coin: 'BTC',
    size: '0.5',
    entryPrice: '50000',
    positionValue: '25000',
    unrealizedPnl: '-5000',
    marginUsed: '2500',
    leverage: {
      type: 'isolated',
      value: 10,
    },
    liquidationPrice: '45000',
    maxLeverage: 50,
    returnOnEquity: '-0.20', // -20%
    cumulativeFunding: {
      allTime: '0',
      sinceOpen: '0',
      sinceChange: '0',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('basic functionality', () => {
    it('does not show banner when disabled', () => {
      const position = createMockPosition();

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 48000,
          enabled: false,
        }),
      );

      expect(result.current.shouldShowBanner).toBe(false);
      expect(result.current.variant).toBeNull();
    });

    it('does not show banner when no position', () => {
      const { result } = renderHook(() =>
        useStopLossPrompt({
          position: null,
          currentPrice: 48000,
        }),
      );

      expect(result.current.shouldShowBanner).toBe(false);
      expect(result.current.variant).toBeNull();
    });

    it('does not show banner for cross margin positions', () => {
      const position = createMockPosition({
        leverage: { type: 'cross', value: 10 },
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 48000,
        }),
      );

      expect(result.current.shouldShowBanner).toBe(false);
      expect(result.current.variant).toBeNull();
    });

    it('does not show banner when position has stop loss', () => {
      const position = createMockPosition({
        stopLossPrice: '47000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 48000,
        }),
      );

      expect(result.current.shouldShowBanner).toBe(false);
      expect(result.current.variant).toBeNull();
    });
  });

  describe('add_margin variant', () => {
    it('shows add_margin variant when within liquidation threshold', () => {
      // Position with liquidation at 45000, current price 45500 (1.1% away)
      const position = createMockPosition({
        liquidationPrice: '45000',
        returnOnEquity: '-0.10', // Not at ROE threshold
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 45500, // 1.1% from liquidation
        }),
      );

      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('add_margin');
      expect(result.current.liquidationDistance).toBeLessThan(
        STOP_LOSS_PROMPT_CONFIG.LIQUIDATION_DISTANCE_THRESHOLD,
      );
    });

    it('calculates liquidation distance correctly', () => {
      const position = createMockPosition({
        liquidationPrice: '45000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 50000,
        }),
      );

      // Distance = |50000 - 45000| / 50000 * 100 = 10%
      expect(result.current.liquidationDistance).toBe(10);
    });
  });

  describe('stop_loss variant', () => {
    it('shows stop_loss variant after ROE debounce period', () => {
      const position = createMockPosition({
        returnOnEquity: '-0.25', // -25% ROE
        liquidationPrice: '40000', // Far from liquidation
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 50000, // 20% from liquidation
        }),
      );

      // Initially should not show (debounce not complete)
      expect(result.current.shouldShowBanner).toBe(false);

      // Fast-forward past debounce period
      act(() => {
        jest.advanceTimersByTime(STOP_LOSS_PROMPT_CONFIG.ROE_DEBOUNCE_MS + 100);
      });

      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('stop_loss');
    });

    it('does not show stop_loss variant if ROE recovers before debounce', () => {
      const position = createMockPosition({
        returnOnEquity: '-0.25', // -25% ROE
        liquidationPrice: '40000',
      });

      const { result, rerender } = renderHook(
        ({ pos }) =>
          useStopLossPrompt({
            position: pos,
            currentPrice: 50000,
          }),
        { initialProps: { pos: position } },
      );

      // Fast-forward halfway through debounce
      act(() => {
        jest.advanceTimersByTime(STOP_LOSS_PROMPT_CONFIG.ROE_DEBOUNCE_MS / 2);
      });

      // ROE recovers
      const recoveredPosition = createMockPosition({
        returnOnEquity: '-0.10', // -10% ROE (above threshold)
        liquidationPrice: '40000',
      });

      rerender({ pos: recoveredPosition });

      // Fast-forward past original debounce time
      act(() => {
        jest.advanceTimersByTime(STOP_LOSS_PROMPT_CONFIG.ROE_DEBOUNCE_MS);
      });

      expect(result.current.shouldShowBanner).toBe(false);
    });
  });

  describe('suggested stop loss calculations', () => {
    it('calculates suggested stop loss price for long position', () => {
      const position = createMockPosition({
        entryPrice: '50000',
        size: '1', // Long position
        leverage: { type: 'isolated', value: 10 },
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 48000,
        }),
      );

      // With -50% target ROE and 10x leverage:
      // priceChange = (-0.50 * 50000) / 10 / 1 = -2500
      // slPrice = 50000 + (-2500) = 47500
      expect(result.current.suggestedStopLossPrice).toBe('47500');
    });

    it('calculates suggested stop loss price for short position', () => {
      const position = createMockPosition({
        entryPrice: '50000',
        size: '-1', // Short position
        leverage: { type: 'isolated', value: 10 },
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 52000,
        }),
      );

      // With -50% target ROE and 10x leverage for short:
      // priceChange = (-0.50 * 50000) / 10 / -1 = 2500
      // slPrice = 50000 + 2500 = 52500
      expect(result.current.suggestedStopLossPrice).toBe('52500');
    });

    it('returns target ROE as suggested stop loss percent', () => {
      const position = createMockPosition({
        entryPrice: '50000',
        size: '1',
        leverage: { type: 'isolated', value: 10 },
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 48000,
        }),
      );

      // Should return the configured target ROE (-50%), not the price change (-5%)
      expect(result.current.suggestedStopLossPercent).toBe(
        STOP_LOSS_PROMPT_CONFIG.SUGGESTED_STOP_LOSS_ROE,
      );
    });

    it('returns null for suggested price when no position', () => {
      const { result } = renderHook(() =>
        useStopLossPrompt({
          position: null,
          currentPrice: 48000,
        }),
      );

      expect(result.current.suggestedStopLossPrice).toBeNull();
      expect(result.current.suggestedStopLossPercent).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles zero current price', () => {
      const position = createMockPosition();

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 0,
        }),
      );

      expect(result.current.liquidationDistance).toBeNull();
    });

    it('handles invalid liquidation price', () => {
      const position = createMockPosition({
        liquidationPrice: 'invalid',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 48000,
        }),
      );

      expect(result.current.liquidationDistance).toBeNull();
    });

    it('handles missing entry price', () => {
      const position = createMockPosition({
        entryPrice: undefined as unknown as string,
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 48000,
        }),
      );

      expect(result.current.suggestedStopLossPrice).toBeNull();
    });

    it('prioritizes add_margin over stop_loss when both conditions met', () => {
      const position = createMockPosition({
        returnOnEquity: '-0.30', // Below ROE threshold
        liquidationPrice: '49000', // Very close to liquidation
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 49500, // 1% from liquidation
        }),
      );

      // add_margin takes priority
      expect(result.current.variant).toBe('add_margin');
    });
  });
});
