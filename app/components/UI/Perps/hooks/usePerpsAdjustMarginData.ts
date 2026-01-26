import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
  usePerpsLivePositions,
  usePerpsLiveAccount,
  usePerpsLivePrices,
} from './stream';
import { usePerpsMarkets } from './usePerpsMarkets';
import { usePerpsTrading } from './usePerpsTrading';
import {
  calculateMaxRemovableMargin,
  estimateLiquidationPriceAfterMarginChange,
} from '../utils/marginUtils';
import { MARGIN_ADJUSTMENT_CONFIG } from '../constants/perpsConfig';
import type { Position } from '../controllers/types';

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
  /** Current margin in position */
  currentMargin: number;
  /** Position notional value */
  positionValue: number;
  /** Max amount that can be added/removed */
  maxAmount: number;
  /** Current liquidation price */
  currentLiquidationPrice: number;
  /** New liquidation price after adjustment */
  newLiquidationPrice: number;
  /** Current liquidation distance percentage */
  currentLiquidationDistance: number;
  /** New liquidation distance percentage */
  newLiquidationDistance: number;
  /** Available balance for add mode */
  availableBalance: number;
  /** Current market price */
  currentPrice: number;
  /** Whether this is add mode */
  isAddMode: boolean;
  /** Position leverage */
  positionLeverage: number;
}

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
  const {
    estimateLiquidationPriceAfterMarginChange:
      estimateLiquidationPriceAfterMarginChangeFromProvider,
  } = usePerpsTrading();

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
  const maxLeverage = marketInfo?.maxLeverage
    ? parseInt(marketInfo.maxLeverage, 10)
    : MARGIN_ADJUSTMENT_CONFIG.FALLBACK_MAX_LEVERAGE;

  // Derived values from live position
  const currentMargin = useMemo(
    () => parseFloat(position?.marginUsed || '0'),
    [position],
  );

  const positionValue = useMemo(
    () => parseFloat(position?.positionValue || '0'),
    [position],
  );

  const currentLiquidationPrice = useMemo(
    () => parseFloat(position?.liquidationPrice || '0'),
    [position],
  );

  const [
    providerEstimatedLiquidationPrice,
    setProviderEstimatedLiquidationPrice,
  ] = useState<number | null>(null);
  const estimateRequestIdRef = useRef(0);

  const positionSize = useMemo(
    () => Math.abs(parseFloat(position?.size || '0')),
    [position],
  );

  const entryPrice = useMemo(
    () => parseFloat(position?.entryPrice || '0'),
    [position],
  );

  const isLong = useMemo(
    () => parseFloat(position?.size || '0') > 0,
    [position],
  );

  const currentPrice = useMemo(
    () => parseFloat(livePrices?.[symbol]?.price || '0'),
    [livePrices, symbol],
  );

  const availableBalance = useMemo(
    () => parseFloat(account?.availableBalance || '0'),
    [account],
  );

  const positionLeverage = position?.leverage?.value || maxLeverage;

  // Calculate max removable/addable amount
  const maxAmount = useMemo(() => {
    if (isAddMode) {
      return Math.max(0, availableBalance);
    }
    return calculateMaxRemovableMargin({
      currentMargin,
      positionSize,
      entryPrice,
      currentPrice,
      positionLeverage,
      notionalValue: positionValue,
    });
  }, [
    isAddMode,
    availableBalance,
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

  const fallbackNewLiquidationPrice = useMemo(() => {
    if (newMargin === 0) {
      return currentLiquidationPrice;
    }

    return estimateLiquidationPriceAfterMarginChange({
      entryPrice,
      isLong,
      currentMargin,
      newMargin,
      positionSize,
      currentLiquidationPrice,
    });
  }, [
    entryPrice,
    isLong,
    currentMargin,
    newMargin,
    positionSize,
    currentLiquidationPrice,
  ]);

  // Provider-based estimate (preferred for parity with open position screen).
  useEffect(() => {
    // If no change, keep parity with current liquidation price and avoid extra work.
    if (newMargin === currentMargin) {
      setProviderEstimatedLiquidationPrice(null);
      return;
    }

    if (!position || !symbol) {
      setProviderEstimatedLiquidationPrice(null);
      return;
    }

    if (
      !isFinite(entryPrice) ||
      entryPrice <= 0 ||
      !isFinite(positionValue) ||
      positionValue <= 0 ||
      !isFinite(positionSize) ||
      positionSize <= 0 ||
      !isFinite(currentMargin) ||
      currentMargin <= 0 ||
      !isFinite(newMargin) ||
      newMargin <= 0
    ) {
      setProviderEstimatedLiquidationPrice(null);
      return;
    }

    const requestId = ++estimateRequestIdRef.current;
    let isCancelled = false;

    async function run() {
      try {
        const estimate =
          await estimateLiquidationPriceAfterMarginChangeFromProvider({
            asset: symbol,
            entryPrice,
            direction: isLong ? 'long' : 'short',
            positionSize,
            positionValueUsd: positionValue,
            currentMarginUsd: currentMargin,
            newMarginUsd: newMargin,
            marginType: position.leverage?.type ?? 'isolated',
            providerId: position.providerId,
          });

        if (isCancelled || estimateRequestIdRef.current !== requestId) {
          return;
        }

        const parsed = parseFloat(estimate);
        setProviderEstimatedLiquidationPrice(
          isFinite(parsed) && parsed > 0 ? parsed : null,
        );
      } catch {
        if (isCancelled || estimateRequestIdRef.current !== requestId) {
          return;
        }
        setProviderEstimatedLiquidationPrice(null);
      }
    }

    run();

    return () => {
      isCancelled = true;
    };
  }, [
    estimateLiquidationPriceAfterMarginChangeFromProvider,
    position,
    symbol,
    entryPrice,
    isLong,
    positionSize,
    positionValue,
    currentMargin,
    newMargin,
  ]);

  const newLiquidationPrice =
    providerEstimatedLiquidationPrice ?? fallbackNewLiquidationPrice;

  // Calculate liquidation distance
  const calculateDistance = useCallback(
    (liquidationPrice: number) => {
      if (currentPrice === 0 || liquidationPrice === 0) return 0;
      return (Math.abs(currentPrice - liquidationPrice) / currentPrice) * 100;
    },
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
    currentMargin,
    positionValue,
    maxAmount,
    currentLiquidationPrice,
    newLiquidationPrice,
    currentLiquidationDistance,
    newLiquidationDistance,
    availableBalance,
    currentPrice,
    isAddMode,
    positionLeverage,
  };
}
