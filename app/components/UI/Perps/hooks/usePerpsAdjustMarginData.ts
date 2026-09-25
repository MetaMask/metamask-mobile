import { useMemo, useCallback } from 'react';
import {
  usePerpsLivePositions,
  usePerpsLiveAccount,
  usePerpsLivePrices,
} from './stream';
import { usePerpsMarkets } from './usePerpsMarkets';
import {
  calculateMaxRemovableMargin,
  estimateLiquidationPrice,
} from '../utils/marginUtils';
import { calculateLiquidationDistance } from '../utils/liquidationDistance';
import {
  MARGIN_ADJUSTMENT_CONFIG,
  type Position,
} from '@metamask/perps-controller';

export interface UsePerpsAdjustMarginDataParams {
  /** Symbol from route params to identify the position */
  symbol: string;
  /** Mode: 'add' or 'remove' */
  mode: 'add' | 'remove';
  /** Current user input amount */
  inputAmount: number;
}

export interface UsePerpsAdjustMarginDataReturn {
  /** Live position data (null if not found) */
  position: Position | null;
  /** Whether position data is still loading */
  isLoading: boolean;
  /** Whether all authoritative position fields are valid for adjustment */
  hasValidPositionData: boolean;
  /** Current margin in position */
  currentMargin: number;
  /** Margin after applying the current input amount */
  newMargin: number;
  /** Position notional value */
  positionValue: number;
  /** Max amount that can be added/removed */
  maxAmount: number;
  /**
   * Largest amount the exchange accepts right now. For remove mode this has no
   * price-move headroom, so a tick after choosing Max does not invalidate it.
   */
  exchangeMaxAmount: number;
  /** Current liquidation price */
  currentLiquidationPrice: number;
  /** New liquidation price after adjustment */
  newLiquidationPrice: number;
  /** Current liquidation distance percentage */
  currentLiquidationDistance: number;
  /** New liquidation distance percentage */
  newLiquidationDistance: number;
  /** Available balance for add mode */
  spendableBalance: number;
  /** Current market price */
  currentPrice: number;
  /** Whether this is add mode */
  isAddMode: boolean;
  /** Position leverage */
  positionLeverage: number;
}

const parseFiniteNumber = (
  value: string | number | null | undefined,
  fallback = 0,
): number => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return fallback;
  }
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const parseMaxLeverage = (
  value: string | number | null | undefined,
  fallback: number,
): number =>
  parseFiniteNumber(
    typeof value === 'string' ? value.trim().replace(/x$/i, '') : value,
    fallback,
  );

/**
 * Hook for margin adjustment data and calculations
 *
 * This hook encapsulates all business logic for the adjust margin view:
 * - Fetches live position data from WebSocket subscription
 * - Calculates max removable/addable margin
 * - Computes liquidation price changes
 *
 * @param params - Configuration with coin, mode, and input amount
 * @returns Computed values ready for display
 */
export function usePerpsAdjustMarginData(
  params: UsePerpsAdjustMarginDataParams,
): UsePerpsAdjustMarginDataReturn {
  const { symbol, mode, inputAmount } = params;
  const isAddMode = mode === 'add';

  // Live data subscriptions
  const { positions, isInitialLoading } = usePerpsLivePositions();
  const { account } = usePerpsLiveAccount();
  const livePrices = usePerpsLivePrices({
    symbols: symbol ? [symbol] : [],
    throttleMs: 1000,
  });
  const { markets } = usePerpsMarkets();

  // Find live position for this symbol
  const position = useMemo(
    () => positions?.find((p) => p.symbol === symbol) || null,
    [positions, symbol],
  );

  // Get market info for max leverage fallback
  const marketInfo = useMemo(
    () => (symbol ? markets.find((m) => m.symbol === symbol) : null),
    [symbol, markets],
  );
  const parsedMaxLeverage = parseMaxLeverage(
    marketInfo?.maxLeverage,
    MARGIN_ADJUSTMENT_CONFIG.FallbackMaxLeverage,
  );
  const maxLeverage =
    parsedMaxLeverage > 0
      ? parsedMaxLeverage
      : MARGIN_ADJUSTMENT_CONFIG.FallbackMaxLeverage;

  // Parse the live position once so every derived calculation uses one snapshot.
  const {
    currentMargin,
    positionValue,
    currentLiquidationPrice,
    positionSize,
    entryPrice,
    isLong,
    parsedPositionLeverage,
    hasValidPositionData,
  } = useMemo(() => {
    const signedPositionSize = parseFiniteNumber(position?.size);
    const currentMarginValue = parseFiniteNumber(position?.marginUsed);
    const positionValueValue = parseFiniteNumber(position?.positionValue);
    const entryPriceValue = parseFiniteNumber(position?.entryPrice);
    const leverageValue = parseFiniteNumber(position?.leverage?.value);
    return {
      currentMargin: currentMarginValue,
      positionValue: positionValueValue,
      currentLiquidationPrice: parseFiniteNumber(position?.liquidationPrice),
      positionSize: Math.abs(signedPositionSize),
      entryPrice: entryPriceValue,
      isLong: signedPositionSize > 0,
      parsedPositionLeverage: leverageValue,
      hasValidPositionData:
        Boolean(position) &&
        currentMarginValue > 0 &&
        positionValueValue > 0 &&
        signedPositionSize !== 0 &&
        entryPriceValue > 0 &&
        leverageValue > 0,
    };
  }, [position]);

  const currentPrice = useMemo(
    () => parseFiniteNumber(livePrices?.[symbol]?.price),
    [livePrices, symbol],
  );

  const spendableBalance = useMemo(
    () => parseFiniteNumber(account?.spendableBalance),
    [account],
  );

  const positionLeverage =
    parsedPositionLeverage > 0 ? parsedPositionLeverage : maxLeverage;

  // Calculate max removable/addable amount. The exchange max has no price-move
  // headroom so it can validate an amount chosen before a tick.
  const { maxAmount, exchangeMaxAmount } = useMemo(() => {
    if (isAddMode) {
      const addable = Math.max(0, spendableBalance);
      return { maxAmount: addable, exchangeMaxAmount: addable };
    }
    const removable = (priceMoveBufferRatio?: number) =>
      calculateMaxRemovableMargin({
        currentMargin,
        positionSize,
        entryPrice,
        currentPrice,
        positionLeverage,
        notionalValue: positionValue,
        priceMoveBufferRatio,
      });
    return { maxAmount: removable(), exchangeMaxAmount: removable(0) };
  }, [
    isAddMode,
    spendableBalance,
    currentMargin,
    positionSize,
    entryPrice,
    currentPrice,
    positionLeverage,
    positionValue,
  ]);

  // Calculate new margin after adjustment
  const newMargin = useMemo(() => {
    if (isAddMode) {
      return currentMargin + inputAmount;
    }
    return Math.max(0, currentMargin - inputAmount);
  }, [isAddMode, currentMargin, inputAmount]);

  // Estimate new liquidation price using anchored + delta approach.
  // Starts from Hyperliquid's actual liquidation price and applies margin delta.
  // To avoid flicker on submit, the view resets inputAmount to 0 immediately,
  // which makes newMargin === currentMargin, returning currentLiquidationPrice.
  const newLiquidationPrice = useMemo(() => {
    if (newMargin === 0 || positionSize === 0) return currentLiquidationPrice;

    return estimateLiquidationPrice({
      isLong,
      currentMargin,
      newMargin,
      positionSize,
      currentLiquidationPrice,
      maxLeverage,
    });
  }, [
    isLong,
    currentMargin,
    newMargin,
    positionSize,
    currentLiquidationPrice,
    maxLeverage,
  ]);

  // Calculate liquidation distance
  const calculateDistance = useCallback(
    (liquidationPrice: number) =>
      calculateLiquidationDistance(currentPrice, liquidationPrice),
    [currentPrice],
  );

  const currentLiquidationDistance = useMemo(
    () => calculateDistance(currentLiquidationPrice),
    [calculateDistance, currentLiquidationPrice],
  );

  const newLiquidationDistance = useMemo(
    () => calculateDistance(newLiquidationPrice),
    [calculateDistance, newLiquidationPrice],
  );

  return {
    position,
    isLoading: isInitialLoading,
    hasValidPositionData,
    currentMargin,
    newMargin,
    positionValue,
    maxAmount,
    exchangeMaxAmount,
    currentLiquidationPrice,
    newLiquidationPrice,
    currentLiquidationDistance,
    newLiquidationDistance,
    spendableBalance,
    currentPrice,
    isAddMode,
    positionLeverage,
  };
}
