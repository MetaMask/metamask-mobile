import QuickCrypto from 'react-native-quick-crypto';
import { Side, type OrderPreview, type PredictFees } from '../types';

const CENTS_PER_UNIT = 100;
const CENT_ROUNDING_TOLERANCE = 1e-8;

/**
 * Generates a unique order ID using react-native-quick-crypto's randomUUID
 * @returns A unique order ID string
 */
export function generateOrderId(): string {
  return QuickCrypto.randomUUID();
}

export function calculateMaxBetAmount(
  availableBalance: number,
  preview?: OrderPreview | null,
): number {
  if (!Number.isFinite(availableBalance) || availableBalance <= 0) {
    return 0;
  }

  const fees = preview?.fees;
  const serviceFeeRate = Math.max(fees?.totalFeePercentage ?? 0, 0) / 100;
  const previewStake = preview?.maxAmountSpent ?? 0;
  const marketFeeRate =
    previewStake > 0 ? Math.max(fees?.marketFee ?? 0, 0) / previewStake : 0;
  const maxBetAmount = availableBalance / (1 + serviceFeeRate + marketFeeRate);

  // The keypad accepts cents, so floor rather than round to avoid exceeding
  // the wallet balance after fees are added back to the stake.
  return roundDownToCents(maxBetAmount);
}

export function roundUpToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const amountInCents = amount * CENTS_PER_UNIT;

  return Math.ceil(amountInCents - CENT_ROUNDING_TOLERANCE) / CENTS_PER_UNIT;
}

export function roundDownToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const amountInCents = amount * CENTS_PER_UNIT;

  return Math.floor(amountInCents + CENT_ROUNDING_TOLERANCE) / CENTS_PER_UNIT;
}

export function roundToFiveDecimals(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round((amount + Number.EPSILON) * 100000) / 100000;
}

export function getPredictMarketFee(fees?: PredictFees): number {
  return fees?.marketFee ?? 0;
}

export function getPredictExchangeFee(fees?: PredictFees): number {
  return (fees?.providerFee ?? 0) + getPredictMarketFee(fees);
}

export function getPredictSellNetProceeds(
  preview?: OrderPreview | null,
): number {
  if (!preview) {
    return 0;
  }
  const fees = preview.fees;
  return roundDownToCents(
    preview.minAmountReceived -
      (fees?.metamaskFee ?? 0) -
      getPredictExchangeFee(fees),
  );
}

/**
 * Derives display value and P&L from a net (after-fee) position value so P&L
 * never reads positive on a position that loses money after fees.
 */
export function getPredictPositionDisplay(args: {
  initialValue: number;
  netValue: number;
}): { value: number; cashPnl: number; percentPnl: number } {
  const cashPnl = args.netValue - args.initialValue;
  const percentPnl =
    args.initialValue > 0 ? (cashPnl / args.initialValue) * 100 : 0;

  return {
    value: args.netValue,
    cashPnl,
    percentPnl,
  };
}

/**
 * Estimates cash-out proceeds net of service fees from a gross position value.
 * Used where no SELL order preview exists (list rows); omits the order-book
 * market fee and per-market fee waivers, so it can differ from an actual
 * preview by a small amount.
 */
export function estimatePredictSellNetValue(args: {
  grossValue: number;
  feeCollection: { enabled: boolean; metamaskFee: number; providerFee: number };
}): number {
  if (!args.feeCollection.enabled) {
    return roundDownToCents(args.grossValue);
  }

  const feeRate =
    args.feeCollection.metamaskFee + args.feeCollection.providerFee;

  return roundDownToCents(args.grossValue - args.grossValue * feeRate);
}

/**
 * Open (sellable) positions show cash-out proceeds. Resolved positions redeem
 * the gross value — selling fees do not apply to claims.
 */
export function getPredictPositionNetValue(args: {
  sellable: boolean;
  grossValue: number;
  preview?: OrderPreview | null;
  feeCollection: { enabled: boolean; metamaskFee: number; providerFee: number };
}): number {
  if (!args.sellable) {
    return roundDownToCents(args.grossValue);
  }

  return args.preview
    ? getPredictSellNetProceeds(args.preview)
    : estimatePredictSellNetValue({
        grossValue: args.grossValue,
        feeCollection: args.feeCollection,
      });
}

/**
 * Builds fee breakdown sheet amounts whose itemized rows sum exactly to the
 * displayed total: each row is snapped to cents, and the exchange fee absorbs
 * the rounding remainder. BUY rows add up to the total; SELL rows subtract
 * down to it.
 */
export function buildPredictFeeBreakdownAmounts(args: {
  side: Side;
  order: number;
  metamaskFee: number;
  depositFee?: number;
  total: number;
}): {
  order: number;
  metamaskFee: number;
  exchangeFee: number;
  depositFee?: number;
  total: number;
} {
  const { side, order, metamaskFee, total, depositFee } = args;
  const snap = side === Side.BUY ? roundUpToCents : roundDownToCents;
  const snappedOrder = snap(order);
  const snappedMetamaskFee = snap(metamaskFee);
  const snappedTotal = snap(total);
  const includeDeposit = depositFee !== undefined && depositFee !== 0;
  const snappedDepositFee = includeDeposit ? snap(depositFee) : 0;

  if (side === Side.BUY && snappedOrder === 0 && snappedTotal === 0) {
    return {
      order: 0,
      metamaskFee: 0,
      exchangeFee: 0,
      total: 0,
    };
  }
  let orderCents = Math.round(snappedOrder * CENTS_PER_UNIT);
  let metamaskFeeCents = Math.round(snappedMetamaskFee * CENTS_PER_UNIT);
  const depositFeeCents = includeDeposit
    ? Math.round(snappedDepositFee * CENTS_PER_UNIT)
    : 0;
  const totalCents = Math.round(snappedTotal * CENTS_PER_UNIT);
  let exchangeFeeCents =
    side === Side.BUY
      ? totalCents - orderCents - metamaskFeeCents - depositFeeCents
      : orderCents - metamaskFeeCents - totalCents;

  if (exchangeFeeCents < 0) {
    if (side === Side.BUY) {
      orderCents += exchangeFeeCents;
    } else {
      metamaskFeeCents += exchangeFeeCents;
    }
    exchangeFeeCents = 0;
  }

  const orderAmount = orderCents / CENTS_PER_UNIT;
  const metamaskFeeAmount = metamaskFeeCents / CENTS_PER_UNIT;
  const exchangeFee = exchangeFeeCents / CENTS_PER_UNIT;

  if (includeDeposit) {
    return {
      order: orderAmount,
      metamaskFee: metamaskFeeAmount,
      exchangeFee,
      depositFee: snappedDepositFee,
      total: snappedTotal,
    };
  }

  return {
    order: orderAmount,
    metamaskFee: metamaskFeeAmount,
    exchangeFee,
    total: snappedTotal,
  };
}

export function getPredictBuyAllInCost(preview?: OrderPreview | null): number {
  if (!preview) {
    return 0;
  }

  const fees = preview.fees;

  return roundUpToCents(
    preview.maxAmountSpent +
      (fees?.metamaskFee ?? 0) +
      (fees?.providerFee ?? 0) +
      getPredictMarketFee(fees),
  );
}
