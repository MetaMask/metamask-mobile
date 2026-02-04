import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
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
  /** Timestamp when position was opened (from order fills) - bypasses debounce if position is >2min old */
  positionOpenedTimestamp?: number;
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
  /** Whether banner is currently visible (includes dismissing state) */
  isVisible: boolean;
  /** Whether banner is in fade-out animation state */
  isDismissing: boolean;
  /** Callback when fade-out animation completes */
  onDismissComplete: () => void;
}

/**
 * Hook to determine if and which stop loss prompt banner to show
 *
 * Implements the logic from TASK_AUTOSET.md:
 * - Shows "add_margin" variant when within 3% of liquidation
 * - Shows "stop_loss" variant when ROE <= -10% for 60s (debounced)
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
 *   positionOpenedTimestamp: 1234567890000, // Optional: from order fills
 * });
 * ```
 */
export const useStopLossPrompt = ({
  position,
  currentPrice,
  enabled = true,
  positionOpenedTimestamp,
}: UseStopLossPromptParams): UseStopLossPromptResult => {
  // Track when ROE first dropped below threshold for debouncing
  const roeBelowThresholdSinceRef = useRef<number | null>(null);
  const hasBeenShownRef = useRef(false);
  const [roeDebounceComplete, setRoeDebounceComplete] = useState(false);

  // Track when the current position was first detected (client-side)
  // This is used to enforce the minimum position age requirement
  const positionFirstSeenRef = useRef<{
    symbol: string;
    timestamp: number;
  } | null>(null);
  const [positionAgeCheckPassed, setPositionAgeCheckPassed] = useState(false);

  // Visibility orchestration state
  // Tracks fade-out animation when banner conditions no longer met
  const [isDismissing, setIsDismissing] = useState(false);
  // Preserve variant during fade-out so banner can still render with correct content
  const [dismissingVariant, setDismissingVariant] =
    useState<StopLossPromptVariant | null>(null);
  const prevShouldShowBannerRef = useRef(false);
  const prevVariantRef = useRef<StopLossPromptVariant | null>(null);

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

  // Callback to finish debounce (from main - for server timestamp bypass)
  const finishDebounce = useCallback(() => {
    setRoeDebounceComplete(true);
    hasBeenShownRef.current = true;
  }, []);

  // Reset hasBeenShownRef when position changes (from main)
  useEffect(() => {
    hasBeenShownRef.current = false;
  }, [position?.symbol, position?.liquidationPrice, position?.entryPrice]);

  // Server timestamp bypass effect (from main)
  // If positionOpenedTimestamp shows position is >2 minutes old, bypass debounce AND position age check
  useEffect(() => {
    if (!enabled || roePercent === null || hasBeenShownRef.current) {
      return;
    }

    // Check if position was opened more than 2 minutes ago (from order fills timestamp)
    const POSITION_AGE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const positionAge = positionOpenedTimestamp
      ? Date.now() - positionOpenedTimestamp
      : 0;

    const isBelowThreshold = roePercent <= STOP_LOSS_PROMPT_CONFIG.RoeThreshold;

    // If position is old enough (from actual order fill data), bypass both debounce and position age check
    // Server timestamp is authoritative - no need to wait for client-side age tracking
    if (positionAge >= POSITION_AGE_THRESHOLD_MS && isBelowThreshold) {
      setPositionAgeCheckPassed(true); // Also bypass client-side age check
      finishDebounce();
    }
  }, [positionOpenedTimestamp, enabled, roePercent, finishDebounce]);

  // Handle client-side position age tracking (from HEAD)
  // Track when a position is first detected and enforce minimum age before showing banners
  useEffect(() => {
    if (!enabled || !position?.symbol) {
      // Reset when disabled or no position
      positionFirstSeenRef.current = null;
      setPositionAgeCheckPassed(false);
      return;
    }

    // Check if this is a new position (different symbol or first time seeing it)
    if (
      !positionFirstSeenRef.current ||
      positionFirstSeenRef.current.symbol !== position.symbol
    ) {
      positionFirstSeenRef.current = {
        symbol: position.symbol,
        timestamp: Date.now(),
      };
      setPositionAgeCheckPassed(false);
    }

    // Check if minimum age has passed
    const elapsed = Date.now() - positionFirstSeenRef.current.timestamp;
    if (elapsed >= STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs) {
      setPositionAgeCheckPassed(true);
    } else {
      // Set up timer to check again when age threshold is reached
      const remainingTime = STOP_LOSS_PROMPT_CONFIG.PositionMinAgeMs - elapsed;
      const timer = setTimeout(() => {
        setPositionAgeCheckPassed(true);
      }, remainingTime);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [enabled, position?.symbol]);

  // Handle ROE debounce logic
  useEffect(() => {
    if (!enabled || roePercent === null) {
      roeBelowThresholdSinceRef.current = null;
      setRoeDebounceComplete(false);
      hasBeenShownRef.current = false; // Reset when position is closed
      return;
    }

    const isBelowThreshold = roePercent <= STOP_LOSS_PROMPT_CONFIG.RoeThreshold;

    if (isBelowThreshold) {
      // Start tracking if not already
      if (roeBelowThresholdSinceRef.current === null) {
        roeBelowThresholdSinceRef.current = Date.now();
      }

      // Check if debounce period has passed
      const elapsed = Date.now() - roeBelowThresholdSinceRef.current;
      if (elapsed >= STOP_LOSS_PROMPT_CONFIG.RoeDebounceMs) {
        finishDebounce();
      } else {
        // Set up timer to check again
        const remainingTime = STOP_LOSS_PROMPT_CONFIG.RoeDebounceMs - elapsed;
        const timer = setTimeout(() => {
          // Re-check if still below threshold
          if (roeBelowThresholdSinceRef.current !== null) {
            finishDebounce();
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
  }, [enabled, roePercent, position, positionOpenedTimestamp, finishDebounce]);

  // Calculate suggested stop loss price as midpoint between current price and liquidation price
  // This provides a balanced protection point that limits losses while avoiding premature triggers
  const suggestedStopLossPrice = useMemo(() => {
    // Dev override: provide mock price for stop_loss variant without position
    if (__DEV__ && FORCE_BANNER_VARIANT === 'stop_loss' && !position) {
      return '45000'; // Mock price for display
    }

    if (!position?.liquidationPrice || !currentPrice || currentPrice <= 0) {
      return null;
    }

    const liquidationPrice = parseFloat(position.liquidationPrice);

    if (isNaN(liquidationPrice) || liquidationPrice <= 0) {
      return null;
    }

    // Calculate midpoint between current price and liquidation price
    const midpointPrice = (currentPrice + liquidationPrice) / 2;

    // Ensure SL price is positive and reasonable
    if (midpointPrice <= 0) {
      return null;
    }

    return midpointPrice.toString();
  }, [position, currentPrice]);

  // Calculate the ROE percentage at the suggested stop loss price
  // This represents the ROE the user will experience if the stop loss triggers
  const suggestedStopLossPercent = useMemo(() => {
    // Dev override: provide mock percentage for stop_loss variant without position
    if (__DEV__ && FORCE_BANNER_VARIANT === 'stop_loss' && !position) {
      return STOP_LOSS_PROMPT_CONFIG.SuggestedStopLossRoe;
    }

    if (!suggestedStopLossPrice || !position?.entryPrice) {
      return null;
    }

    const entryPrice = parseFloat(position.entryPrice);
    const slPrice = parseFloat(suggestedStopLossPrice);
    const leverage = position.leverage?.value ?? 1;
    const positionSize = parseFloat(position.size);

    if (
      isNaN(entryPrice) ||
      entryPrice <= 0 ||
      isNaN(slPrice) ||
      leverage <= 0
    ) {
      return null;
    }

    // Calculate ROE at the suggested stop loss price
    // ROE = (priceChange / entryPrice) * leverage * direction
    const isLong = positionSize >= 0;
    const direction = isLong ? 1 : -1;
    const priceChange = slPrice - entryPrice;
    const roe = (priceChange / entryPrice) * leverage * direction * 100;

    return roe;
  }, [suggestedStopLossPrice, position]);

  // Safety guard: Check if suggested SL price is too close to current price
  // If within 3% of mark price, we should show "add_margin" instead to avoid accidental immediate fills
  const isSuggestedSlTooClose = useMemo(() => {
    if (!suggestedStopLossPrice || !currentPrice || currentPrice <= 0) {
      return false;
    }
    const slPrice = parseFloat(suggestedStopLossPrice);
    if (isNaN(slPrice) || slPrice <= 0) {
      return false;
    }
    const distance = (Math.abs(currentPrice - slPrice) / currentPrice) * 100;
    return distance < STOP_LOSS_PROMPT_CONFIG.LiquidationDistanceThreshold; // Within 3% of current price
  }, [suggestedStopLossPrice, currentPrice]);

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

    // Suppression check: Position age requirement
    // Don't show any banner until position has been open for at least POSITION_MIN_AGE_MS
    if (!positionAgeCheckPassed) {
      return { shouldShowBanner: false, variant: null };
    }

    // Suppression check: Minimum loss requirement
    // No banner shown until ROE drops below MIN_LOSS_THRESHOLD (-10%)
    if (
      roePercent === null ||
      roePercent > STOP_LOSS_PROMPT_CONFIG.MinLossThreshold
    ) {
      return { shouldShowBanner: false, variant: null };
    }

    // Priority 1: Near liquidation → Add margin variant
    if (
      liquidationDistance !== null &&
      liquidationDistance < STOP_LOSS_PROMPT_CONFIG.LiquidationDistanceThreshold
    ) {
      return { shouldShowBanner: true, variant: 'add_margin' };
    }

    // Priority 2: ROE below threshold with debounce → Stop loss variant
    // But if suggested SL is too close to current price (within 3%), show add_margin instead
    if (roeDebounceComplete) {
      // Guard: Don't show stop_loss variant if we can't calculate a valid suggested price
      // This prevents displaying garbled banner text like "Set a stop loss at ( ROE)"
      if (!suggestedStopLossPrice) {
        return { shouldShowBanner: true, variant: 'add_margin' };
      }
      if (isSuggestedSlTooClose) {
        // Safety guard: SL price too close to current price, suggest adding margin instead
        return { shouldShowBanner: true, variant: 'add_margin' };
      }
      return { shouldShowBanner: true, variant: 'stop_loss' };
    }

    return { shouldShowBanner: false, variant: null };
  }, [
    enabled,
    position,
    liquidationDistance,
    roeDebounceComplete,
    isSuggestedSlTooClose,
    suggestedStopLossPrice,
    positionAgeCheckPassed,
    roePercent,
  ]);

  // Handle visibility orchestration - detect transitions and trigger fade-out
  // When shouldShowBanner transitions from true → false, trigger dismissing state
  // Also capture the variant so banner can continue rendering during animation
  useEffect(() => {
    const prevShouldShow = prevShouldShowBannerRef.current;
    const prevVariant = prevVariantRef.current;

    // Update refs for next render
    prevShouldShowBannerRef.current = shouldShowBanner;
    prevVariantRef.current = variant;

    // Transition from showing to hidden → trigger fade-out animation
    if (prevShouldShow && !shouldShowBanner && !isDismissing) {
      setIsDismissing(true);
      // Capture the variant that was showing so it's preserved during fade-out
      setDismissingVariant(prevVariant);
    }

    // Reset dismissing state if conditions worsen again (banner needs to show)
    if (shouldShowBanner && isDismissing) {
      setIsDismissing(false);
      setDismissingVariant(null);
    }
  }, [shouldShowBanner, isDismissing, variant]);

  // Reset visibility orchestration when position changes
  useEffect(() => {
    setIsDismissing(false);
    setDismissingVariant(null);
    prevShouldShowBannerRef.current = false;
    prevVariantRef.current = null;
  }, [position?.symbol]);

  // Callback when fade-out animation completes
  const onDismissComplete = useCallback(() => {
    setIsDismissing(false);
    setDismissingVariant(null);
  }, []);

  // Banner is visible when conditions are met OR when dismissing (for animation)
  const isVisible = shouldShowBanner || isDismissing;

  // Use preserved variant during fade-out so banner can still render with correct content
  const effectiveVariant = isDismissing ? dismissingVariant : variant;

  return {
    shouldShowBanner,
    variant: effectiveVariant,
    liquidationDistance,
    suggestedStopLossPrice,
    suggestedStopLossPercent,
    isVisible,
    isDismissing,
    onDismissComplete,
  };
};

export default useStopLossPrompt;
