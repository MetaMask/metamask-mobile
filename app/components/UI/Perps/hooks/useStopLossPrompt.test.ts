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
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS / 2,
        );
      });

      // Still should not show
      expect(result.current.shouldShowBanner).toBe(false);

      // Advance past the age requirement
      act(() => {
        jest.advanceTimersByTime(
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS / 2 + 100,
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
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS + 100,
        );
      });

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
          STOP_LOSS_PROMPT_CONFIG.ROE_DEBOUNCE_MS,
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS,
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
        jest.advanceTimersByTime(STOP_LOSS_PROMPT_CONFIG.ROE_DEBOUNCE_MS / 2);
      });

      // ROE recovers
      const recoveredPosition = createMockPosition({
        returnOnEquity: '-0.05', // -5% ROE (above threshold)
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
        jest.advanceTimersByTime(STOP_LOSS_PROMPT_CONFIG.ROE_DEBOUNCE_MS - 100);
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
        jest.advanceTimersByTime(STOP_LOSS_PROMPT_CONFIG.ROE_DEBOUNCE_MS + 100);
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
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS + 100,
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
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS + 100,
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
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS + 100,
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
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS + 100,
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
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS + 100,
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
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS + 100,
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
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS + 100,
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
          STOP_LOSS_PROMPT_CONFIG.ROE_DEBOUNCE_MS,
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS,
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
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS + 100,
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
          STOP_LOSS_PROMPT_CONFIG.POSITION_MIN_AGE_MS + 100,
        );
      });

      // add_margin takes priority
      expect(result.current.variant).toBe('add_margin');
    });
  });
});
