import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  usePerpsLivePositions,
  usePerpsLiveAccount,
  usePerpsLivePrices,
} from './stream';
import { usePerpsMarkets } from './usePerpsMarkets';
import { usePerpsMarginAdjustmentLimits } from './usePerpsMarginAdjustmentLimits';
import { usePerpsNetwork } from './usePerpsNetwork';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import { formatLiquidationDistance } from '../utils/formatUtils';
import {
  calculateMaxRemovableMargin,
  estimateLiquidationPriceAfterMarginChange,
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
  /** Max amount that can be added/removed; undefined while unknown */
  maxAmount: number | undefined;
  /**
   * Largest amount the exchange accepts right now. For remove mode this has no
   * price-move headroom, so a tick after choosing Max does not invalidate it.
   */
  exchangeMaxAmount: number | undefined;
  /** Current liquidation price; undefined while unknown */
  currentLiquidationPrice: number | undefined;
  /** New liquidation price after adjustment; undefined while unknown */
  newLiquidationPrice: number | undefined;
  /**
   * Current liquidation distance from Core `formatLiquidationDistance`, e.g.
   * `"20.00%"`; undefined while either price is unknown.
   */
  currentLiquidationDistance: string | undefined;
  /** New liquidation distance, formatted the same way; undefined while unknown */
  newLiquidationDistance: string | undefined;
  /** Current market price; undefined while unknown */
  currentPrice: number | undefined;
  /** 24h percent change from the price stream; null until available */
  percentChange24h: number | null;
  /** Whether this is add mode */
  isAddMode: boolean;
  /** Position leverage */
  positionLeverage: number;
}

/** Parses a live value; undefined when it is missing or not finite. */
const parseOptionalNumber = (
  value: string | number | null | undefined,
): number | undefined => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined;
  }
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

const parseFiniteNumber = (
  value: string | number | null | undefined,
  fallback = 0,
): number => parseOptionalNumber(value) ?? fallback;

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

  const { account } = usePerpsLiveAccount({ providerId: position?.providerId });

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
      currentLiquidationPrice: parseOptionalNumber(position?.liquidationPrice),
      positionSize: Math.abs(signedPositionSize),
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
    () => parseOptionalNumber(livePrices?.[symbol]?.price),
    [livePrices, symbol],
  );

  const percentChange24h = useMemo(() => {
    const rawPercentChange = Number.parseFloat(
      livePrices?.[symbol]?.percentChange24h ?? '',
    );
    return Number.isFinite(rawPercentChange) ? rawPercentChange : null;
  }, [livePrices, symbol]);

  const spendableBalance = useMemo(
    () => parseOptionalNumber(account?.spendableBalance),
    [account],
  );

  const perpsNetwork = usePerpsNetwork();
  const accountAddress = useSelector(selectPerpsSelectedAccountAddress);
  const settledBalance = useMemo(() => {
    const total = parseOptionalNumber(account?.totalBalance);
    const unrealizedPnl = parseOptionalNumber(account?.unrealizedPnl);
    return total === undefined || unrealizedPnl === undefined
      ? undefined
      : total - unrealizedPnl;
  }, [account]);
  const limits = usePerpsMarginAdjustmentLimits({
    symbol,
    providerId: position?.providerId,
    contextKey: `${accountAddress ?? ''}|${perpsNetwork}`,
    positionKey: position
      ? [
          position.size,
          position.entryPrice,
          position.leverage?.value,
          (
            Number.parseFloat(position.marginUsed) -
            Number.parseFloat(position.unrealizedPnl)
          ).toFixed(2),
        ].join('|')
      : '',
    settledBalance,
    priceTick: livePrices?.[symbol]?.timestamp,
    enabled: hasValidPositionData,
  });

  const positionLeverage =
    parsedPositionLeverage > 0 ? parsedPositionLeverage : maxLeverage;

  // The venue's limits. A provider that reports none (Lighter) uses the
  // streamed balance and Core's removable margin. The exchange max has no
  // price-move headroom so it can validate an amount chosen before a tick.
  const { maxAmount, exchangeMaxAmount } = useMemo(() => {
    const removable = (priceMoveBufferRatio?: number) =>
      hasValidPositionData
        ? calculateMaxRemovableMargin({
            currentMargin,
            positionSize,
            currentPrice,
            positionLeverage,
            notionalValue: positionValue,
            priceMoveBufferRatio,
          })
        : undefined;

    if (limits?.status === 'available') {
      const limit = parseOptionalNumber(
        isAddMode ? limits.maxAdd : limits.maxRemove,
      );
      const exchangeRemovable = removable(0);
      return {
        maxAmount: limit,
        exchangeMaxAmount:
          isAddMode || !limit || exchangeRemovable === undefined
            ? limit
            : Math.max(limit, exchangeRemovable),
      };
    }
    if (limits?.reason !== 'provider') {
      return { maxAmount: undefined, exchangeMaxAmount: undefined };
    }
    if (isAddMode) {
      const addable =
        spendableBalance === undefined
          ? undefined
          : Math.max(0, spendableBalance);
      return { maxAmount: addable, exchangeMaxAmount: addable };
    }
    return { maxAmount: removable(), exchangeMaxAmount: removable(0) };
  }, [
    limits,
    isAddMode,
    spendableBalance,
    hasValidPositionData,
    currentMargin,
    positionSize,
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
    if (
      currentLiquidationPrice === undefined ||
      newMargin === 0 ||
      positionSize === 0
    ) {
      return currentLiquidationPrice;
    }

    return estimateLiquidationPriceAfterMarginChange({
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

  // Core liquidation distance; undefined while either price is unknown, never
  // 0 ("at liquidation").
  const currentLiquidationDistance = useMemo(
    () => formatLiquidationDistance(currentPrice, currentLiquidationPrice),
    [currentPrice, currentLiquidationPrice],
  );

  const newLiquidationDistance = useMemo(
    () => formatLiquidationDistance(currentPrice, newLiquidationPrice),
    [currentPrice, newLiquidationPrice],
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
    currentPrice,
    percentChange24h,
    isAddMode,
    positionLeverage,
  };
}
