import {
  DECIMAL_PRECISION_CONFIG,
  getMaxAllowedAmount,
  PERPS_CONSTANTS,
  formatHyperLiquidPrice,
  calculateMarginRequired,
  calculatePositionSize,
  isLimitExecutionOrderType,
  isTriggerOrderType,
  type OrderType,
} from '@metamask/perps-controller';
import { BigNumber } from 'bignumber.js';

export interface ProspectiveExecutionPriceInput {
  orderType: OrderType;
  /** Limit price for limit and trigger-limit placements. */
  limitPrice?: string;
  /** Trigger price for trigger-market placements. */
  triggerPrice?: string;
  /** Live mid used when no user price is available. */
  marketPrice: number;
}

export interface DeriveOrderSizingInput {
  /** USD amount the user intends to trade (order form `amount`). */
  amount: string;
  orderType: OrderType;
  /** Limit price string when the order executes as a limit. */
  limitPrice?: string;
  /** Trigger price string when the order is a trigger-market placement. */
  triggerPrice?: string;
  /** Mid/market price used for market orders and display. */
  marketPrice: number;
  /** Oracle mark price used as the standard margin basis. */
  markPrice: number;
  leverage: number;
  /** Asset size decimals from market data; falls back when unknown. */
  szDecimals: number | null;
  /** Direction used to calculate trigger-market slippage caps. */
  isBuy?: boolean;
  /** Effective max slippage used by trigger-market placements. */
  maxSlippageBps?: number;
  /** True while market data is still loading (defers derived values). */
  isLoadingMarketData: boolean;
}

export interface DeriveOrderSizingResult {
  /** Price used for size/margin math: the limit price for priced limit orders, else market. */
  effectivePrice: number;
  /** Position size (token units) as a display string, or the fallback placeholder while loading. */
  positionSize: string;
  /** Required margin in USD, or `undefined` while loading / when no amount is set. */
  marginRequired: string | undefined;
}

export interface TriggerMarketSlippageCapPriceInput {
  triggerPrice: string;
  isBuy: boolean;
  maxSlippageBps: number;
  szDecimals: number;
}

/**
 * Resolves the worst-case execution price used to reserve trigger-market
 * margin. Hyperliquid applies the slippage cap after a trigger activates.
 *
 * @param input - Trigger price, direction, slippage, and asset precision.
 * @returns The venue-formatted cap price, or `undefined` for invalid input.
 */
export const getTriggerMarketSlippageCapPrice = ({
  triggerPrice,
  isBuy,
  maxSlippageBps,
  szDecimals,
}: TriggerMarketSlippageCapPriceInput): number | undefined => {
  const parsedTriggerPrice = new BigNumber(triggerPrice);
  if (
    !parsedTriggerPrice.isFinite() ||
    parsedTriggerPrice.lte(0) ||
    !Number.isFinite(maxSlippageBps) ||
    maxSlippageBps < 0
  ) {
    return undefined;
  }

  const slippageMultiplier = isBuy
    ? 1 + maxSlippageBps / 10_000
    : 1 - maxSlippageBps / 10_000;
  if (slippageMultiplier <= 0) {
    return undefined;
  }

  const formattedPrice = formatHyperLiquidPrice({
    price: parsedTriggerPrice.times(slippageMultiplier).toString(),
    szDecimals,
  });
  const capPrice = Number.parseFloat(formattedPrice);
  return Number.isFinite(capPrice) && capPrice > 0 ? capPrice : undefined;
};

/**
 * Calculates a USD max using a target size price and a potentially different
 * submitted execution price. This keeps size semantics at the trigger while
 * reserving enough margin for a buy-side slippage cap.
 *
 * @param input - Balance, target price, execution price, precision, and leverage.
 * @returns The buffered maximum USD amount.
 */
export const getMaxAllowedAmountAtExecutionPrice = ({
  spendableBalance,
  sizePrice,
  executionPrice,
  assetSzDecimals,
  leverage,
}: {
  spendableBalance: number;
  sizePrice: number;
  executionPrice: number;
  assetSzDecimals: number;
  leverage: number;
}): number => {
  if (
    !Number.isFinite(sizePrice) ||
    sizePrice <= 0 ||
    !Number.isFinite(executionPrice) ||
    executionPrice <= 0
  ) {
    return 0;
  }

  return getMaxAllowedAmount({
    spendableBalance,
    assetPrice: sizePrice,
    assetSzDecimals,
    leverage,
    ...(executionPrice > sizePrice
      ? {
          orderType: 'limit',
          limitPrice: executionPrice,
        }
      : {}),
  });
};

/**
 * Prospective execution price for sizing, margin, liquidation, and fees.
 *
 * Limit and trigger-limit use a valid limit price; trigger-market uses a valid
 * trigger price; otherwise the live mid.
 *
 * @param input - Order type and candidate prices.
 * @returns A positive reference price, or `marketPrice` when none is valid.
 */
export const getProspectiveExecutionPrice = ({
  orderType,
  limitPrice,
  triggerPrice,
  marketPrice,
}: ProspectiveExecutionPriceInput): number => {
  if (isLimitExecutionOrderType(orderType)) {
    const parsedLimitPrice = Number.parseFloat(limitPrice ?? '');
    return parsedLimitPrice > 0 ? parsedLimitPrice : marketPrice;
  }

  if (isTriggerOrderType(orderType)) {
    const parsedTriggerPrice = Number.parseFloat(triggerPrice ?? '');
    return parsedTriggerPrice > 0 ? parsedTriggerPrice : marketPrice;
  }

  return marketPrice;
};

/**
 * Pure derivation of the order-form sizing values (effective price, position
 * size, margin required) shared by the lite (`PerpsOrderView`) and Pro
 * (`usePerpsProOrderForm`) order forms.
 *
 * Priced placements (limit, trigger-limit with a limit, trigger-market with a
 * trigger) size and margin off that price; otherwise the mid is used for
 * sizing and the oracle mark price is used for margin.
 *
 * @param input - Order sizing inputs.
 * @returns The effective price, position size, and margin required.
 */
export const deriveOrderSizing = ({
  amount,
  orderType,
  limitPrice,
  triggerPrice,
  marketPrice,
  markPrice,
  leverage,
  szDecimals,
  isBuy = true,
  maxSlippageBps,
  isLoadingMarketData,
}: DeriveOrderSizingInput): DeriveOrderSizingResult => {
  const parsedLimitPrice = isLimitExecutionOrderType(orderType)
    ? Number.parseFloat(limitPrice ?? '')
    : Number.NaN;
  const parsedTriggerPrice =
    isTriggerOrderType(orderType) && !isLimitExecutionOrderType(orderType)
      ? Number.parseFloat(triggerPrice ?? '')
      : Number.NaN;
  const hasPricedReference = parsedLimitPrice > 0 || parsedTriggerPrice > 0;
  const effectivePrice = getProspectiveExecutionPrice({
    orderType,
    limitPrice,
    triggerPrice,
    marketPrice,
  });
  const hasValidTriggerPrice = parsedTriggerPrice > 0;
  const isTriggerMarketOrder =
    isTriggerOrderType(orderType) && !isLimitExecutionOrderType(orderType);
  const triggerMarketMarginPrice =
    isTriggerMarketOrder &&
    triggerPrice !== undefined &&
    hasValidTriggerPrice &&
    maxSlippageBps !== undefined
      ? getTriggerMarketSlippageCapPrice({
          triggerPrice,
          isBuy,
          maxSlippageBps,
          szDecimals:
            szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals,
        })
      : undefined;
  const marginPrice =
    triggerMarketMarginPrice ??
    (hasPricedReference ? effectivePrice : markPrice);

  const positionSize = isLoadingMarketData
    ? PERPS_CONSTANTS.FallbackDataDisplay
    : calculatePositionSize({
        amount,
        price: effectivePrice,
        szDecimals: szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals,
      });

  let marginRequired: string | undefined;
  if (!isLoadingMarketData && amount) {
    marginRequired = calculateMarginRequired({
      amount: BigNumber(marginPrice).times(positionSize).toString(),
      leverage,
    });
  }

  return { effectivePrice, positionSize, marginRequired };
};

export interface ReduceOnlyMaxUsdAmountInput {
  /** Signed or unsigned position size in token units. */
  positionSize?: string;
  /** Price used to convert size to USD (limit price when set, else market). */
  price: number;
}

/**
 * USD notional of an open position at `price`. Used as the Pro size-slider
 * max when Reduce Only is on so the range tracks position size, not
 * available margin.
 *
 * @param input - Position size and conversion price.
 * @returns The USD notional, or `0` when size or price is missing/invalid.
 */
export const getReduceOnlyMaxUsdAmount = ({
  positionSize,
  price,
}: ReduceOnlyMaxUsdAmountInput): number => {
  const absSize = Math.abs(Number.parseFloat(positionSize ?? ''));
  if (
    !Number.isFinite(absSize) ||
    absSize <= 0 ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return 0;
  }

  return new BigNumber(absSize).times(price).toNumber();
};
