import { renderHook, act } from '@testing-library/react-hooks';
import { useStopLossPrompt } from './useStopLossPrompt';
import type { Position } from '../controllers/types';
import { STOP_LOSS_PROMPT_CONFIG } from '../constants/perpsConfig';

// Mock timers for debounce testing
jest.useFakeTimers();

describe('useStopLossPrompt', () => {
  const createMockPosition = (overrides: Partial<Position> = {}): Position => ({
    symbol: 'BTC',
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
    returnOnEquity: '-0.05', // -5% (above threshold for most tests)
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

    it('does not show banner until position age requirement is met', () => {
      // Position that would normally trigger add_margin banner
      const position = createMockPosition({
        liquidationPrice: '45000',
        returnOnEquity: '-0.10',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 45500, // Within 3% of liquidation
        }),
      );

      // Should not show immediately due to position age requirement
      expect(result.current.shouldShowBanner).toBe(false);
      expect(result.current.variant).toBeNull();

      // Advance halfway through the age requirement
      act(() => {
        jest.advanceTimersByTime(STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs / 2);
      });

      // Still should not show
      expect(result.current.shouldShowBanner).toBe(false);

      // Advance past the age requirement
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs / 2 + 100,
        );
      });

      // Now should show
      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('add_margin');
    });
  });

  describe('add_margin variant', () => {
    it('shows add_margin variant when within liquidation threshold', () => {
      // Position with liquidation at 45000, current price 45500 (1.1% away)
      // Note: ROE must be at or below MIN_LOSS_THRESHOLD (-10%) for banner to show
      const position = createMockPosition({
        liquidationPrice: '45000',
        returnOnEquity: '-0.10', // -10% (at threshold - required for any banner to show)
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 45500, // 1.1% from liquidation
        }),
      );

      // Initially should not show (position age check not passed)
      expect(result.current.shouldShowBanner).toBe(false);

      // Fast-forward past position age requirement
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs + 100,
        );
      });

      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('add_margin');
      expect(result.current.liquidationDistance).toBeLessThan(
        STOP_LOSS_PROMPT_CONFIG.LiquidationDistanceThreshold,
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
    it('shows stop_loss variant after both position age and ROE debounce requirements are met', () => {
      const position = createMockPosition({
        returnOnEquity: '-0.15', // -15% ROE (below -10% threshold)
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

      // Explicitly advance past BOTH position age AND ROE debounce requirements
      // Both timers must complete for the banner to show
      const requiredTime =
        Math.max(
          STOP_LOSS_PROMPT_CONFIG.RoeDebounceMs,
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs,
        ) + 100;

      act(() => {
        jest.advanceTimersByTime(requiredTime);
      });

      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('stop_loss');
    });

    it('does not show stop_loss variant if ROE recovers before debounce', () => {
      const position = createMockPosition({
        returnOnEquity: '-0.15', // -15% ROE (below -10% threshold)
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
        jest.advanceTimersByTime(STOP_LOSS_PROMPT_CONFIG.RoeDebounceMs / 2);
      });

      // ROE recovers
      const recoveredPosition = createMockPosition({
        returnOnEquity: '-0.05', // -5% ROE (above threshold)
        liquidationPrice: '40000',
      });

      rerender({ pos: recoveredPosition });

      // Fast-forward past original debounce time
      act(() => {
        jest.advanceTimersByTime(STOP_LOSS_PROMPT_CONFIG.RoeDebounceMs);
      });

      expect(result.current.shouldShowBanner).toBe(false);
    });
  });

  describe('positionOpenedTimestamp bypass logic', () => {
    const POSITION_AGE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

    beforeEach(() => {
      jest.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
    });

    it('bypasses debounce immediately when position is older than 2 minutes and ROE is below threshold', async () => {
      const now = Date.now();
      const positionOpenedTimestamp = now - POSITION_AGE_THRESHOLD_MS - 1000; // 2 minutes 1 second ago
      const position = createMockPosition({
        returnOnEquity: '-0.15', // -15% ROE (below -10% threshold)
        liquidationPrice: '40000', // Far from liquidation
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 50000,
          positionOpenedTimestamp,
        }),
      );

      // Flush effects to allow timestamp bypass to run
      await act(async () => {
        jest.runAllTimers();
      });

      // Shows after effects run (server timestamp bypasses debounce)
      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('stop_loss');
    });

    it('does not bypass debounce when position is less than 2 minutes old', () => {
      const now = Date.now();
      const positionOpenedTimestamp = now - POSITION_AGE_THRESHOLD_MS + 1000; // 1 minute 59 seconds ago
      const position = createMockPosition({
        returnOnEquity: '-0.15', // -15% ROE (below -10% threshold)
        liquidationPrice: '40000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 50000,
          positionOpenedTimestamp,
        }),
      );

      // Should NOT show immediately (position too new)
      expect(result.current.shouldShowBanner).toBe(false);

      // Should still require full debounce period
      act(() => {
        jest.advanceTimersByTime(STOP_LOSS_PROMPT_CONFIG.RoeDebounceMs - 100);
      });

      expect(result.current.shouldShowBanner).toBe(false);

      // After full debounce, should show
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('stop_loss');
    });

    it('does not bypass debounce when ROE is above threshold even if position is old', () => {
      const now = Date.now();
      const positionOpenedTimestamp = now - POSITION_AGE_THRESHOLD_MS - 1000; // 2 minutes 1 second ago
      const position = createMockPosition({
        returnOnEquity: '-0.05', // -5% ROE (above -10% threshold)
        liquidationPrice: '40000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 50000,
          positionOpenedTimestamp,
        }),
      );

      // Should NOT show (ROE above threshold)
      expect(result.current.shouldShowBanner).toBe(false);

      // Even after time passes, should not show
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.shouldShowBanner).toBe(false);
    });

    it('bypasses debounce when position is exactly 2 minutes old', async () => {
      const now = Date.now();
      const positionOpenedTimestamp = now - POSITION_AGE_THRESHOLD_MS; // Exactly 2 minutes ago
      const position = createMockPosition({
        returnOnEquity: '-0.15', // -15% ROE (below -10% threshold)
        liquidationPrice: '40000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 50000,
          positionOpenedTimestamp,
        }),
      );

      // Flush effects to allow timestamp bypass to run
      await act(async () => {
        jest.runAllTimers();
      });

      // Shows after effects run (exactly at threshold)
      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('stop_loss');
    });

    it('bypasses debounce only once per position lifecycle', async () => {
      const now = Date.now();
      const positionOpenedTimestamp = now - POSITION_AGE_THRESHOLD_MS - 1000;
      const position = createMockPosition({
        returnOnEquity: '-0.15', // -15% ROE (below -10% threshold)
        liquidationPrice: '40000',
      });

      const { result, rerender } = renderHook<
        { pos: Position | null; timestamp?: number },
        ReturnType<typeof useStopLossPrompt>
      >(
        ({ pos, timestamp }) =>
          useStopLossPrompt({
            position: pos,
            currentPrice: 50000,
            positionOpenedTimestamp: timestamp,
          }),
        {
          initialProps: { pos: position, timestamp: positionOpenedTimestamp },
        },
      );

      // Flush effects to allow timestamp bypass to run
      await act(async () => {
        jest.runAllTimers();
      });

      // Shows after effects run
      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('stop_loss');

      // Simulate position update (ROE changes but still below threshold)
      const updatedPosition = createMockPosition({
        returnOnEquity: '-0.12', // Still below threshold
        liquidationPrice: '40000',
      });

      rerender({ pos: updatedPosition, timestamp: positionOpenedTimestamp });

      // Still shows (bypass already happened)
      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('stop_loss');
    });

    it('does not bypass when positionOpenedTimestamp is undefined', () => {
      const position = createMockPosition({
        returnOnEquity: '-0.15', // -15% ROE (below -10% threshold)
        liquidationPrice: '40000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 50000,
          positionOpenedTimestamp: undefined,
        }),
      );

      // Should NOT show immediately (no timestamp provided)
      expect(result.current.shouldShowBanner).toBe(false);

      // Should require full debounce period
      act(() => {
        jest.advanceTimersByTime(STOP_LOSS_PROMPT_CONFIG.RoeDebounceMs + 100);
      });

      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('stop_loss');
    });

    it('resets bypass state when position is closed', async () => {
      const now = Date.now();
      const positionOpenedTimestamp = now - POSITION_AGE_THRESHOLD_MS - 1000;
      const position = createMockPosition({
        returnOnEquity: '-0.15',
        liquidationPrice: '40000',
      });

      const { result, rerender } = renderHook<
        { pos: Position | null; timestamp?: number },
        ReturnType<typeof useStopLossPrompt>
      >(
        ({ pos, timestamp }) =>
          useStopLossPrompt({
            position: pos,
            currentPrice: 50000,
            positionOpenedTimestamp: timestamp,
          }),
        {
          initialProps: { pos: position, timestamp: positionOpenedTimestamp },
        },
      );

      // Flush effects to allow timestamp bypass to run
      await act(async () => {
        jest.runAllTimers();
      });

      // Shows after effects run
      expect(result.current.shouldShowBanner).toBe(true);

      // Close position
      rerender({ pos: null, timestamp: undefined });

      expect(result.current.shouldShowBanner).toBe(false);

      // Reopen position with same timestamp
      rerender({ pos: position, timestamp: positionOpenedTimestamp });

      // Flush effects again for the reopened position
      await act(async () => {
        jest.runAllTimers();
      });

      // Shows again (state was reset)
      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('stop_loss');
    });

    it('does not bypass when hook is disabled', () => {
      const now = Date.now();
      const positionOpenedTimestamp = now - POSITION_AGE_THRESHOLD_MS - 1000;
      const position = createMockPosition({
        returnOnEquity: '-0.15',
        liquidationPrice: '40000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 50000,
          positionOpenedTimestamp,
          enabled: false,
        }),
      );

      // Should NOT show (hook disabled)
      expect(result.current.shouldShowBanner).toBe(false);

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.shouldShowBanner).toBe(false);
    });
  });

  describe('suggested stop loss calculations', () => {
    it('calculates suggested stop loss price as midpoint between current price and liquidation for long position', () => {
      const position = createMockPosition({
        entryPrice: '50000',
        size: '1', // Long position
        leverage: { type: 'isolated', value: 10 },
        liquidationPrice: '45000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 48000,
        }),
      );

      // Midpoint between current (48000) and liquidation (45000):
      // midpoint = (48000 + 45000) / 2 = 46500
      expect(result.current.suggestedStopLossPrice).toBe('46500');
    });

    it('calculates suggested stop loss price as midpoint between current price and liquidation for short position', () => {
      const position = createMockPosition({
        entryPrice: '50000',
        size: '-1', // Short position
        leverage: { type: 'isolated', value: 10 },
        liquidationPrice: '55000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 52000,
        }),
      );

      // Midpoint between current (52000) and liquidation (55000):
      // midpoint = (52000 + 55000) / 2 = 53500
      expect(result.current.suggestedStopLossPrice).toBe('53500');
    });

    it('calculates ROE at the midpoint stop loss price for long position', () => {
      const position = createMockPosition({
        entryPrice: '50000',
        size: '1',
        leverage: { type: 'isolated', value: 10 },
        liquidationPrice: '45000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 48000,
        }),
      );

      // Midpoint SL price = 46500
      // ROE = (priceChange / entryPrice) * leverage * direction
      // ROE = ((46500 - 50000) / 50000) * 10 * 1 * 100 = -70%
      expect(result.current.suggestedStopLossPercent).toBe(-70);
    });

    it('calculates ROE at the midpoint stop loss price for short position', () => {
      const position = createMockPosition({
        entryPrice: '50000',
        size: '-1',
        leverage: { type: 'isolated', value: 10 },
        liquidationPrice: '55000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 52000,
        }),
      );

      // Midpoint SL price = 53500
      // ROE = (priceChange / entryPrice) * leverage * direction
      // ROE = ((53500 - 50000) / 50000) * 10 * -1 * 100 = -70%
      expect(result.current.suggestedStopLossPercent).toBe(-70);
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

    it('returns null for suggested price when no liquidation price', () => {
      const position = createMockPosition({
        entryPrice: '50000',
        size: '1',
        leverage: { type: 'isolated', value: 10 },
        liquidationPrice: undefined,
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 48000,
        }),
      );

      expect(result.current.suggestedStopLossPrice).toBeNull();
      expect(result.current.suggestedStopLossPercent).toBeNull();
    });

    it('returns null for suggested price when current price is zero', () => {
      const position = createMockPosition({
        entryPrice: '50000',
        size: '1',
        leverage: { type: 'isolated', value: 10 },
        liquidationPrice: '45000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 0,
        }),
      );

      expect(result.current.suggestedStopLossPrice).toBeNull();
      expect(result.current.suggestedStopLossPercent).toBeNull();
    });
  });

  describe('minimum loss threshold', () => {
    it('does not show banner when loss is below MIN_LOSS_THRESHOLD', () => {
      // Position with -5% ROE (above -10% threshold)
      const position = createMockPosition({
        returnOnEquity: '-0.05', // -5% loss
        liquidationPrice: '45000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 45500, // Within 3% of liquidation
        }),
      );

      // Fast-forward past position age requirement
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs + 100,
        );
      });

      // Should not show because loss is not >= 10%
      expect(result.current.shouldShowBanner).toBe(false);
      expect(result.current.variant).toBeNull();
    });

    it('does not show banner when position is in profit', () => {
      // Position in profit
      const position = createMockPosition({
        returnOnEquity: '0.05', // +5% profit
        liquidationPrice: '45000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 45500,
        }),
      );

      // Fast-forward past position age requirement
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs + 100,
        );
      });

      expect(result.current.shouldShowBanner).toBe(false);
      expect(result.current.variant).toBeNull();
    });

    it('shows add_margin banner when loss >= 10% AND within 3% of liquidation', () => {
      // Position with exactly -10% ROE
      const position = createMockPosition({
        returnOnEquity: '-0.10', // -10% loss
        liquidationPrice: '45000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 45500, // Within 3% of liquidation
        }),
      );

      // Fast-forward past position age requirement
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs + 100,
        );
      });

      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('add_margin');
    });
  });

  describe('visibility orchestration', () => {
    it('returns isVisible false when banner conditions are not met', () => {
      const { result } = renderHook(() =>
        useStopLossPrompt({
          position: null,
          currentPrice: 48000,
        }),
      );

      expect(result.current.isVisible).toBe(false);
      expect(result.current.isDismissing).toBe(false);
    });

    it('returns isVisible true when banner conditions are met', () => {
      const position = createMockPosition({
        returnOnEquity: '-0.10',
        liquidationPrice: '45000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 45500,
        }),
      );

      // Fast-forward past position age requirement
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs + 100,
        );
      });

      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.isVisible).toBe(true);
      expect(result.current.isDismissing).toBe(false);
    });

    it('sets isDismissing when banner transitions from shown to hidden', () => {
      const position = createMockPosition({
        returnOnEquity: '-0.10',
        liquidationPrice: '45000',
      });

      const { result, rerender } = renderHook(
        ({ pos }) =>
          useStopLossPrompt({
            position: pos,
            currentPrice: 45500,
          }),
        { initialProps: { pos: position } },
      );

      // Fast-forward past position age requirement
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs + 100,
        );
      });

      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.isVisible).toBe(true);

      // Position improves (no longer meets conditions)
      const improvedPosition = createMockPosition({
        returnOnEquity: '0.05', // +5% profit
        liquidationPrice: '45000',
      });

      rerender({ pos: improvedPosition });

      // Banner should be dismissing (fade-out animation state)
      expect(result.current.shouldShowBanner).toBe(false);
      expect(result.current.isDismissing).toBe(true);
      expect(result.current.isVisible).toBe(true); // Still visible during animation
    });

    it('clears isDismissing when onDismissComplete is called', () => {
      const position = createMockPosition({
        returnOnEquity: '-0.10',
        liquidationPrice: '45000',
      });

      const { result, rerender } = renderHook(
        ({ pos }) =>
          useStopLossPrompt({
            position: pos,
            currentPrice: 45500,
          }),
        { initialProps: { pos: position } },
      );

      // Fast-forward past position age requirement
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs + 100,
        );
      });

      // Position improves, trigger dismissing
      const improvedPosition = createMockPosition({
        returnOnEquity: '0.05',
        liquidationPrice: '45000',
      });

      rerender({ pos: improvedPosition });

      expect(result.current.isDismissing).toBe(true);

      // Simulate animation complete
      act(() => {
        result.current.onDismissComplete();
      });

      expect(result.current.isDismissing).toBe(false);
      expect(result.current.isVisible).toBe(false);
    });

    it('preserves variant during fade-out animation', () => {
      // Position that triggers add_margin variant (within 3% of liquidation)
      const position = createMockPosition({
        returnOnEquity: '-0.10',
        liquidationPrice: '45000',
      });

      const { result, rerender } = renderHook(
        ({ pos, price }) =>
          useStopLossPrompt({
            position: pos,
            currentPrice: price,
          }),
        { initialProps: { pos: position, price: 45500 } },
      );

      // Fast-forward past position age requirement to show banner
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs + 100,
        );
      });

      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('add_margin');

      // Position improves - no longer meets conditions
      const improvedPosition = createMockPosition({
        returnOnEquity: '0.05', // Profit
        liquidationPrice: '45000',
      });

      rerender({ pos: improvedPosition, price: 45500 });

      // During dismissal, variant is preserved for animation
      expect(result.current.isDismissing).toBe(true);
      expect(result.current.isVisible).toBe(true);
      expect(result.current.variant).toBe('add_margin'); // Still add_margin during fade-out
    });

    it('preserves stop_loss variant during fade-out animation', () => {
      // Position that triggers stop_loss variant
      const position = createMockPosition({
        returnOnEquity: '-0.15', // -15% ROE
        liquidationPrice: '40000', // Far from liquidation
      });

      const { result, rerender } = renderHook(
        ({ pos }) =>
          useStopLossPrompt({
            position: pos,
            currentPrice: 50000, // 20% from liquidation
          }),
        { initialProps: { pos: position } },
      );

      // Fast-forward past both age and debounce requirements
      const requiredTime =
        Math.max(
          STOP_LOSS_PROMPT_CONFIG.RoeDebounceMs,
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs,
        ) + 100;

      act(() => {
        jest.advanceTimersByTime(requiredTime);
      });

      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.variant).toBe('stop_loss');

      // Position improves - no longer meets conditions
      const improvedPosition = createMockPosition({
        returnOnEquity: '0.05', // Profit
        liquidationPrice: '40000',
      });

      rerender({ pos: improvedPosition });

      // During dismissal, variant is preserved for animation
      expect(result.current.isDismissing).toBe(true);
      expect(result.current.isVisible).toBe(true);
      expect(result.current.variant).toBe('stop_loss'); // Still stop_loss during fade-out
    });

    it('resets variant to null after onDismissComplete is called', () => {
      const position = createMockPosition({
        returnOnEquity: '-0.10',
        liquidationPrice: '45000',
      });

      const { result, rerender } = renderHook(
        ({ pos }) =>
          useStopLossPrompt({
            position: pos,
            currentPrice: 45500,
          }),
        { initialProps: { pos: position } },
      );

      // Fast-forward past position age requirement
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs + 100,
        );
      });

      expect(result.current.variant).toBe('add_margin');

      // Position improves, trigger dismissing
      const improvedPosition = createMockPosition({
        returnOnEquity: '0.05',
        liquidationPrice: '45000',
      });

      rerender({ pos: improvedPosition });

      // Variant preserved during dismissal
      expect(result.current.variant).toBe('add_margin');

      // Complete the animation
      act(() => {
        result.current.onDismissComplete();
      });

      // After animation completes, variant is null
      expect(result.current.isDismissing).toBe(false);
      expect(result.current.isVisible).toBe(false);
      expect(result.current.variant).toBeNull();
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
      expect(result.current.suggestedStopLossPrice).toBeNull();
      expect(result.current.suggestedStopLossPercent).toBeNull();
    });

    it('handles missing entry price - still calculates SL price but not percent', () => {
      const position = createMockPosition({
        entryPrice: undefined as unknown as string,
        liquidationPrice: '45000',
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 48000,
        }),
      );

      // SL price uses currentPrice and liquidationPrice (doesn't need entryPrice)
      // Midpoint = (48000 + 45000) / 2 = 46500
      expect(result.current.suggestedStopLossPrice).toBe('46500');
      // But percent needs entryPrice to calculate ROE
      expect(result.current.suggestedStopLossPercent).toBeNull();
    });

    it('prioritizes add_margin over stop_loss when both conditions met', () => {
      const position = createMockPosition({
        returnOnEquity: '-0.15', // Below -10% ROE threshold
        liquidationPrice: '49000', // Very close to liquidation
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 49500, // 1% from liquidation
        }),
      );

      // Fast-forward past position age requirement
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs + 100,
        );
      });

      // add_margin takes priority
      expect(result.current.variant).toBe('add_margin');
    });
  });

  describe('safety guard: suggested SL too close to current price', () => {
    it('shows add_margin when suggested SL is within 3% of current price', () => {
      // Position where midpoint between current and liquidation is within 3% of current
      // Current: 50000, Liquidation: 49000 → Midpoint: 49500 → Distance: 1% from current
      const position = createMockPosition({
        entryPrice: '50000',
        size: '1',
        returnOnEquity: '-0.15', // Below threshold
        liquidationPrice: '49000', // Close to current
        leverage: { type: 'isolated', value: 10 },
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 50000,
        }),
      );

      // Fast-forward past both position age and debounce requirements
      const requiredTime =
        Math.max(
          STOP_LOSS_PROMPT_CONFIG.RoeDebounceMs,
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs,
        ) + 100;

      act(() => {
        jest.advanceTimersByTime(requiredTime);
      });

      // Midpoint = (50000 + 49000) / 2 = 49500
      // Distance from current = |50000 - 49500| / 50000 * 100 = 1%
      // Since < 3%, should show add_margin instead of stop_loss
      expect(result.current.suggestedStopLossPrice).toBe('49500');
      expect(result.current.variant).toBe('add_margin');
    });

    it('shows stop_loss when suggested SL is more than 3% from current price', () => {
      // Position where midpoint is safely away from current price
      // Current: 50000, Liquidation: 40000 → Midpoint: 45000 → Distance: 10% from current
      const position = createMockPosition({
        entryPrice: '50000',
        size: '1',
        returnOnEquity: '-0.15', // Below threshold
        liquidationPrice: '40000', // Far from current
        leverage: { type: 'isolated', value: 10 },
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 50000,
        }),
      );

      // Fast-forward past both position age and debounce requirements
      const requiredTime =
        Math.max(
          STOP_LOSS_PROMPT_CONFIG.RoeDebounceMs,
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs,
        ) + 100;

      act(() => {
        jest.advanceTimersByTime(requiredTime);
      });

      // Midpoint = (50000 + 40000) / 2 = 45000
      // Distance from current = |50000 - 45000| / 50000 * 100 = 10%
      // Since > 3%, should show stop_loss
      expect(result.current.suggestedStopLossPrice).toBe('45000');
      expect(result.current.variant).toBe('stop_loss');
    });

    it('shows add_margin when suggested SL is exactly at 3% threshold', () => {
      // Position where midpoint is exactly at 3% from current
      // Current: 50000, need midpoint at 48500 (3% away)
      // midpoint = (current + liq) / 2, so liq = 2*midpoint - current = 2*48500 - 50000 = 47000
      const position = createMockPosition({
        entryPrice: '50000',
        size: '1',
        returnOnEquity: '-0.15', // Below threshold
        liquidationPrice: '47000',
        leverage: { type: 'isolated', value: 10 },
      });

      const { result } = renderHook(() =>
        useStopLossPrompt({
          position,
          currentPrice: 50000,
        }),
      );

      // Fast-forward past both position age and debounce requirements
      const requiredTime =
        Math.max(
          STOP_LOSS_PROMPT_CONFIG.RoeDebounceMs,
          STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs,
        ) + 100;

      act(() => {
        jest.advanceTimersByTime(requiredTime);
      });

      // Midpoint = (50000 + 47000) / 2 = 48500
      // Distance from current = |50000 - 48500| / 50000 * 100 = 3%
      // Since distance < 3% (not <=), 3% exactly is NOT within threshold, so stop_loss
      expect(result.current.suggestedStopLossPrice).toBe('48500');
      expect(result.current.variant).toBe('stop_loss');
    });
  });
});
