import {
  ORDER_SLIPPAGE_CONFIG,
  type InputMethod,
  type OrderParams,
  type OrderType,
  type Position,
} from '@metamask/perps-controller';
import { derivePerpsTradeAction } from './deriveTradeAction';
import { toPerpsEntryAttribution } from './perpsAnalyticsAttribution';

type OrderTrackingData = OrderParams['trackingData'];

export interface BuildPerpsOrderTrackingDataInput {
  /** Required margin string (converted to a number for the event). */
  marginRequired: string | undefined;
  feeResults: {
    totalFee: number;
    metamaskFee: number;
    metamaskFeeRate: number | undefined;
    feeDiscountPercentage?: number;
    estimatedPoints?: number;
    protocolFeeRate?: number;
  };
  /** Mid/market price at submission. */
  marketPrice: number;
  /** Input method that produced the amount ('default' for the Pro inline form). */
  inputMethod: InputMethod;
  source?: string;
  sourceSection?: string;
  currentMarketPosition?: Position | null;
  direction: 'long' | 'short';
  chartLibrary: string;
  vipTier?: number | null;
  /** Pay-with-any-token context (lite only); omit for the direct Pro path. */
  hasCustomTokenSelected?: boolean;
  payToken?: { symbol?: string; chainId?: string | number } | null;
}

/**
 * Pure assembly of the Perps order `trackingData` MetaMetrics payload shared by
 * the lite (`PerpsOrderView`) and Pro (`usePerpsProOrderForm`) order forms. The
 * pay-with-any-token fields are optional so the direct Pro path can omit them.
 * Mirrors the lite form's original inline object exactly.
 *
 * @param input - Tracking data inputs.
 * @returns The controller `trackingData` payload.
 */
export const buildPerpsOrderTrackingData = ({
  marginRequired,
  feeResults,
  marketPrice,
  inputMethod,
  source,
  sourceSection,
  currentMarketPosition,
  direction,
  chartLibrary,
  vipTier,
  hasCustomTokenSelected,
  payToken,
}: BuildPerpsOrderTrackingDataInput): OrderTrackingData => ({
  marginUsed: Number(marginRequired),
  totalFee: feeResults.totalFee,
  marketPrice,
  metamaskFee: feeResults.metamaskFee,
  metamaskFeeRate: feeResults.metamaskFeeRate,
  feeDiscountPercentage: feeResults.feeDiscountPercentage,
  estimatedPoints: feeResults.estimatedPoints,
  inputMethod,
  source,
  ...toPerpsEntryAttribution({ source, sourceSection }),
  ...(feeResults.protocolFeeRate !== undefined
    ? { hlFeeRate: feeResults.protocolFeeRate }
    : {}),
  tradeAction: derivePerpsTradeAction(currentMarketPosition, direction),
  chartLibrary,
  tradeWithToken: Boolean(hasCustomTokenSelected),
  ...(hasCustomTokenSelected && payToken
    ? {
        mmPayTokenSelected: payToken.symbol ?? '',
        mmPayNetworkSelected: String(payToken.chainId ?? ''),
      }
    : {}),
  vipTier: vipTier ?? undefined,
  vipDiscount: feeResults.feeDiscountPercentage,
});

export interface BuildPerpsOrderParamsInput {
  asset: string;
  isBuy: boolean;
  /** Position size (token units) — kept for backward compat; provider recalculates from usdAmount. */
  size: string;
  orderType: OrderType;
  /** Effective price used for both `currentPrice` and `priceAtCalculation`. */
  effectivePrice: number;
  leverage: number;
  usdAmount: string;
  /** User-configured max slippage (bps); limit orders override to the fixed default. */
  maxSlippageBps: number;
  limitPrice?: string;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  /** Reduce-only flag (Pro only); omitted for lite. */
  reduceOnly?: boolean;
  trackingData: OrderTrackingData;
}

/**
 * Pure assembly of the controller `OrderParams` shared by the lite
 * (`PerpsOrderView`) and Pro (`usePerpsProOrderForm`) order forms. Limit orders
 * use the fixed default slippage; TP/SL/limit price and `reduceOnly` are only
 * included when present. Mirrors the lite form's original inline object exactly.
 *
 * @param input - Order params inputs.
 * @returns The controller `OrderParams`.
 */
export const buildPerpsOrderParams = ({
  asset,
  isBuy,
  size,
  orderType,
  effectivePrice,
  leverage,
  usdAmount,
  maxSlippageBps,
  limitPrice,
  takeProfitPrice,
  stopLossPrice,
  reduceOnly,
  trackingData,
}: BuildPerpsOrderParamsInput): OrderParams => ({
  symbol: asset,
  isBuy,
  size,
  orderType,
  currentPrice: effectivePrice,
  leverage,
  usdAmount,
  priceAtCalculation: effectivePrice,
  maxSlippageBps:
    orderType === 'limit'
      ? ORDER_SLIPPAGE_CONFIG.DefaultLimitSlippageBps
      : maxSlippageBps,
  ...(reduceOnly !== undefined ? { reduceOnly } : {}),
  ...(orderType === 'limit' && limitPrice ? { price: limitPrice } : {}),
  ...(takeProfitPrice?.trim() ? { takeProfitPrice } : {}),
  ...(stopLossPrice?.trim() ? { stopLossPrice } : {}),
  trackingData,
});
