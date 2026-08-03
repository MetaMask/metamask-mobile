import {
  DECIMAL_PRECISION_CONFIG,
  PERPS_CONSTANTS,
  calculateMarginRequired,
  calculatePositionSize,
  type OrderType,
} from '@metamask/perps-controller';
import { BigNumber } from 'bignumber.js';

export interface DeriveOrderSizingInput {
  /** USD amount the user intends to trade (order form `amount`). */
  amount: string;
  orderType: OrderType;
  /** Limit price string when the order type is `limit`. */
  limitPrice?: string;
  /** Mid/market price used for market orders and display. */
  marketPrice: number;
  /** Oracle mark price used as the standard margin basis. */
  markPrice: number;
  leverage: number;
  /** Asset size decimals from market data; falls back when unknown. */
  szDecimals: number | null;
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

/**
 * Pure derivation of the order-form sizing values (effective price, position
 * size, margin required) shared by the lite (`PerpsOrderView`) and Pro
 * (`usePerpsProOrderForm`) order forms.
 *
 * For limit orders with a valid limit price, that price is used for sizing and
 * (implicitly) as the margin basis; otherwise the market price is used for
 * sizing and the oracle mark price is used for margin — mirroring the lite
 * form's original inline logic exactly.
 *
 * @param input - Order sizing inputs.
 * @returns The effective price, position size, and margin required.
 */
export const deriveOrderSizing = ({
  amount,
  orderType,
  limitPrice,
  marketPrice,
  markPrice,
  leverage,
  szDecimals,
  isLoadingMarketData,
}: DeriveOrderSizingInput): DeriveOrderSizingResult => {
  const parsedLimitPrice =
    orderType === 'limit' && limitPrice
      ? Number.parseFloat(limitPrice)
      : Number.NaN;
  const hasValidLimitPrice = parsedLimitPrice > 0;
  const effectivePrice = hasValidLimitPrice ? parsedLimitPrice : marketPrice;

  const positionSize = isLoadingMarketData
    ? PERPS_CONSTANTS.FallbackDataDisplay
    : calculatePositionSize({
        amount,
        price: effectivePrice,
        szDecimals: szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals,
      });

  let marginRequired: string | undefined;
  if (!isLoadingMarketData && amount) {
    const priceForMargin = hasValidLimitPrice ? effectivePrice : markPrice;
    marginRequired = calculateMarginRequired({
      amount: BigNumber(priceForMargin).times(positionSize).toString(),
      leverage,
    });
  }

  return { effectivePrice, positionSize, marginRequired };
};
