import { useMemo, useRef, useEffect, useState } from 'react';
import type { Position } from '../controllers/types';
import { STOP_LOSS_PROMPT_CONFIG } from '../constants/perpsConfig';

export type StopLossPromptVariant = 'stop_loss' | 'add_margin';

/**
 * Development-only override for forcing banner variants
 * Set to 'stop_loss', 'add_margin', or null (normal behavior)
 *
 * Usage: Temporarily change this value to test UI:
 * - FORCE_BANNER_VARIANT = 'add_margin' -> Force add margin banner
 * - FORCE_BANNER_VARIANT = 'stop_loss' -> Force stop loss banner
 * - FORCE_BANNER_VARIANT = null -> Normal behavior (default)
 *
 * Remember to reset to null before committing!
 */
const FORCE_BANNER_VARIANT: StopLossPromptVariant | null = null;

export interface UseStopLossPromptParams {
  /** Current position data (null if no position) */
  position: Position | null | undefined;
  /** Current market price */
  currentPrice: number;
  /** Enable/disable the hook (default: true) */
  enabled?: boolean;
}

export interface UseStopLossPromptResult {
  /** Whether to show the banner */
  shouldShowBanner: boolean;
  /** Which variant to display */
  variant: StopLossPromptVariant | null;
  /** Distance to liquidation as percentage */
  liquidationDistance: number | null;
  /** Suggested stop loss price (midpoint between current and liquidation) */
  suggestedStopLossPrice: string | null;
  /** Suggested stop loss as percentage from entry */
  suggestedStopLossPercent: number | null;
}

/**
 * Hook to determine if and which stop loss prompt banner to show
 *
 * Implements the logic from TASK_AUTOSET.md:
 * - Shows "add_margin" variant when within 3% of liquidation
 * - Shows "stop_loss" variant when ROE <= -20% for 60s (debounced)
 * - Suppresses when position has cross margin or existing stop loss
 *
 * @example
 * ```tsx
 * const {
 *   shouldShowBanner,
 *   variant,
 *   liquidationDistance,
 *   suggestedStopLossPrice,
 * } = useStopLossPrompt({
 *   position: existingPosition,
 *   currentPrice: 50000,
 * });
 * ```
 */
export const useStopLossPrompt = ({
  position,
  currentPrice,
  enabled = true,
}: UseStopLossPromptParams): UseStopLossPromptResult => {
  // Track when ROE first dropped below threshold for debouncing
  const roeBelowThresholdSinceRef = useRef<number | null>(null);
  const [roeDebounceComplete, setRoeDebounceComplete] = useState(false);

  // Calculate liquidation distance
  const liquidationDistance = useMemo(() => {
    // Dev override: provide mock distance for add_margin variant
    if (__DEV__ && FORCE_BANNER_VARIANT === 'add_margin') {
      return 2.5; // Mock 2.5% from liquidation
    }

    if (!position?.liquidationPrice || !currentPrice || currentPrice <= 0) {
      return null;
    }

    const liqPrice = parseFloat(position.liquidationPrice);
    if (isNaN(liqPrice) || liqPrice <= 0) {
      return null;
    }

    return (Math.abs(currentPrice - liqPrice) / currentPrice) * 100;
  }, [position?.liquidationPrice, currentPrice]);

  // Calculate ROE as percentage (position stores as decimal)
  const roePercent = useMemo(() => {
    if (!position?.returnOnEquity) return null;
    const roeValue = parseFloat(position.returnOnEquity);
    if (isNaN(roeValue)) return null;
    return roeValue * 100;
  }, [position?.returnOnEquity]);

  // Handle ROE debounce logic
  useEffect(() => {
    if (!enabled || roePercent === null) {
      roeBelowThresholdSinceRef.current = null;
      setRoeDebounceComplete(false);
      return;
    }

    const isBelowThreshold =
      roePercent <= STOP_LOSS_PROMPT_CONFIG.ROE_THRESHOLD;

    if (isBelowThreshold) {
      // Start tracking if not already
      if (roeBelowThresholdSinceRef.current === null) {
        roeBelowThresholdSinceRef.current = Date.now();
      }

      // Check if debounce period has passed
      const elapsed = Date.now() - roeBelowThresholdSinceRef.current;
      if (elapsed >= STOP_LOSS_PROMPT_CONFIG.ROE_DEBOUNCE_MS) {
        setRoeDebounceComplete(true);
      } else {
        // Set up timer to check again
        const remainingTime = STOP_LOSS_PROMPT_CONFIG.ROE_DEBOUNCE_MS - elapsed;
        const timer = setTimeout(() => {
          // Re-check if still below threshold
          if (roeBelowThresholdSinceRef.current !== null) {
            setRoeDebounceComplete(true);
          }
        }, remainingTime);

        return () => clearTimeout(timer);
      }
    } else {
      // Reset tracking when ROE goes above threshold
      roeBelowThresholdSinceRef.current = null;
      setRoeDebounceComplete(false);
    }

    return undefined;
  }, [enabled, roePercent]);

  // Calculate suggested stop loss price based on entry price and target ROE
  // Formula: For a position, SL price at -50% ROE = entryPrice * (1 + targetROE/100/leverage)
  const suggestedStopLossPrice = useMemo(() => {
    // Dev override: provide mock price for stop_loss variant without position
    if (__DEV__ && FORCE_BANNER_VARIANT === 'stop_loss' && !position) {
      return '45000'; // Mock price for display
    }

    if (!position?.entryPrice) {
      return null;
    }

    const entryPrice = parseFloat(position.entryPrice);
    const leverage = position.leverage?.value ?? 1;
    const positionSize = parseFloat(position.size);

    if (isNaN(entryPrice) || entryPrice <= 0 || leverage <= 0) {
      return null;
    }

    // Target ROE is configurable (default -50%)
    const targetRoeDecimal =
      STOP_LOSS_PROMPT_CONFIG.SUGGESTED_STOP_LOSS_ROE / 100;

    // Calculate price at target ROE
    // ROE = (priceChange / entryPrice) * leverage * direction
    // priceChange = ROE * entryPrice / leverage / direction
    const isLong = positionSize >= 0;
    const direction = isLong ? 1 : -1;
    const priceChange = (targetRoeDecimal * entryPrice) / leverage / direction;
    const slPrice = entryPrice + priceChange;

    // Ensure SL price is positive and reasonable
    if (slPrice <= 0) {
      return null;
    }

    return slPrice.toString();
  }, [position]);

  // Return the target ROE percentage used to calculate the stop loss
  // This represents the ROE the user will experience if the stop loss triggers
  const suggestedStopLossPercent = useMemo(() => {
    // Dev override: provide mock percentage for stop_loss variant without position
    if (__DEV__ && FORCE_BANNER_VARIANT === 'stop_loss' && !position) {
      return STOP_LOSS_PROMPT_CONFIG.SUGGESTED_STOP_LOSS_ROE;
    }

    // Return the configured target ROE if we have a valid stop loss price
    if (!suggestedStopLossPrice) {
      return null;
    }

    // The stop loss price was calculated to achieve this specific ROE
    return STOP_LOSS_PROMPT_CONFIG.SUGGESTED_STOP_LOSS_ROE;
  }, [suggestedStopLossPrice, position]);

  // Determine if banner should show and which variant
  const { shouldShowBanner, variant } = useMemo((): {
    shouldShowBanner: boolean;
    variant: StopLossPromptVariant | null;
  } => {
    // Developer override (only in __DEV__ builds)
    if (__DEV__ && FORCE_BANNER_VARIANT !== null) {
      // eslint-disable-next-line no-console
      console.warn(
        `[useStopLossPrompt] Developer override active: variant=${FORCE_BANNER_VARIANT}`,
      );
      return { shouldShowBanner: true, variant: FORCE_BANNER_VARIANT };
    }

    // Early return if disabled or no position
    if (!enabled || !position) {
      return { shouldShowBanner: false, variant: null };
    }

    // Suppression check: Cross margin positions
    if (position.leverage?.type === 'cross') {
      return { shouldShowBanner: false, variant: null };
    }

    // Suppression check: Already has stop loss
    if (position.stopLossPrice && parseFloat(position.stopLossPrice) > 0) {
      return { shouldShowBanner: false, variant: null };
    }

    // Suppression check: Has take profit that would close before liquidation
    // Note: Full implementation would check if TP price is before liquidation
    // For simplicity, we just check if TP exists (can be enhanced later)
    if (position.takeProfitPrice && parseFloat(position.takeProfitPrice) > 0) {
      // Only suppress if user has at least some protection
      // Actually per spec: "User already has any stop or a TP that would close full size before liquidation"
      // Since we can't easily verify "before liquidation", we'll only suppress if they have SL
      // So we'll NOT suppress just for having TP
    }

    // Priority 1: Near liquidation → Add margin variant
    if (
      liquidationDistance !== null &&
      liquidationDistance <
        STOP_LOSS_PROMPT_CONFIG.LIQUIDATION_DISTANCE_THRESHOLD
    ) {
      return { shouldShowBanner: true, variant: 'add_margin' };
    }

    // Priority 2: ROE below threshold with debounce → Stop loss variant
    // Note: Position age check skipped as createdAt not available in Position type
    if (roeDebounceComplete) {
      return { shouldShowBanner: true, variant: 'stop_loss' };
    }

    return { shouldShowBanner: false, variant: null };
  }, [enabled, position, liquidationDistance, roeDebounceComplete]);

  return {
    shouldShowBanner,
    variant,
    liquidationDistance,
    suggestedStopLossPrice,
    suggestedStopLossPercent,
  };
};

export default useStopLossPrompt;
