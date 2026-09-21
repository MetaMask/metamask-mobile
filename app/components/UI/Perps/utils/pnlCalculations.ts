/**
 * P&L calculation utilities for Perps trading
 */

import { type Position } from '@metamask/perps-controller';

export interface PnLCalculationParams {
  entryPrice: number;
  currentPrice: number;
  size: number;
}

export interface PnLResult {
  pnl: number;
  pnlPercentage: number;
}

export interface PnLFromUnrealizedParams {
  unrealizedPnl: number;
  entryPrice: number;
  size: number;
}

export interface TotalPnLParams {
  positions: Position[];
}

export interface ExpectedPnLParams {
  triggerPrice: number;
  entryPrice: number;
  size: number;
  closingFee: number;
}

/**
 * Calculate P&L for a position.
 *
 * @param params - P&L calculation parameters
 * @returns The calculated profit or loss value
 */
export function calculatePnL(params: PnLCalculationParams): number {
  const { entryPrice, currentPrice, size } = params;
  return (currentPrice - entryPrice) * size;
}

/**
 * Calculate expected profit/loss for TP/SL trigger, accounting for closing fees.
 * Reuses calculatePnL for gross P&L, then subtracts fees.
 *
 * @param params - Expected P&L calculation parameters
 * @returns The expected net profit or loss after fees
 */
export function calculateExpectedPnL(params: ExpectedPnLParams): number {
  const { triggerPrice, entryPrice, size, closingFee } = params;
  const grossPnL = calculatePnL({
    entryPrice,
    currentPrice: triggerPrice,
    size,
  });
  return grossPnL - closingFee;
}

/**
 * Calculate P&L percentage for a position.
 *
 * @param params - P&L calculation parameters
 * @returns The P&L as a percentage value
 */
export function calculatePnLPercentage(params: PnLCalculationParams): number {
  const { entryPrice, currentPrice, size } = params;
  return ((currentPrice - entryPrice) / entryPrice) * 100 * Math.sign(size);
}

/**
 * Calculate both P&L and P&L percentage.
 *
 * @param params - P&L calculation parameters
 * @returns Object containing both P&L value and percentage
 */
export function calculatePnLWithPercentage(
  params: PnLCalculationParams,
): PnLResult {
  return {
    pnl: calculatePnL(params),
    pnlPercentage: calculatePnLPercentage(params),
  };
}

/**
 * Calculate P&L percentage based on unrealized P&L and position value.
 * This is used when current price is not available.
 *
 * @param params - Parameters including unrealized P&L, entry price, and size
 * @returns The P&L as a percentage value
 */
export function calculatePnLPercentageFromUnrealized(
  params: PnLFromUnrealizedParams,
): number {
  const { unrealizedPnl, entryPrice, size } = params;
  const entryValue = entryPrice * Math.abs(size);
  if (entryValue === 0) return 0;
  return (unrealizedPnl / entryValue) * 100;
}

/**
 * Calculate total P&L for multiple positions.
 *
 * @param params - Parameters containing array of positions
 * @returns The sum of unrealized P&L across all positions
 */
export function calculateTotalPnL(params: TotalPnLParams): number {
  const { positions } = params;
  return positions.reduce(
    (sum, position) => sum + parseFloat(position.unrealizedPnl || '0'),
    0,
  );
}

/**
 * Calculate total P&L percentage for multiple positions.
 *
 * @param params - Parameters containing array of positions
 * @returns The weighted average P&L percentage across all positions
 */
export function calculateTotalPnLPercentage(params: TotalPnLParams): number {
  const { positions } = params;
  let totalPnl = 0;
  let totalEntryValue = 0;

  positions.forEach((position) => {
    const pnl = parseFloat(position.unrealizedPnl || '0');
    const entryPrice = parseFloat(position.entryPrice || '0');
    const size = Math.abs(parseFloat(position.size || '0'));
    const entryValue = entryPrice * size;

    totalPnl += pnl;
    totalEntryValue += entryValue;
  });

  return totalEntryValue === 0 ? 0 : (totalPnl / totalEntryValue) * 100;
}

export interface PositionAggregateTotals {
  /** Σ unrealizedPnl across the given positions */
  unrealizedPnl: string;
  /**
   * Margin-weighted ROE as a percentage string (e.g. `"15"` for 15%).
   *
   * Contract (matches Hyperliquid `adaptAccountStateFromSDK`):
   * `returnOnEquity = (Σ (position.returnOnEquity × marginUsed) / Σ marginUsed) × 100`
   * where each position's `returnOnEquity` is the protocol decimal (0.10 = 10%).
   *
   * This equals Σpnl / Σmargin only when every supplied ROE equals pnl / margin.
   */
  returnOnEquity: string;
}

/**
 * Aggregate unrealized P&L and margin-weighted ROE for a position subset
 * (e.g. ticker-filtered Pro positions).
 */
export function calculatePositionAggregateTotals(
  positions: Position[],
): PositionAggregateTotals {
  let unrealizedPnl = 0;
  let weightedReturnOnEquity = 0;
  let totalMarginUsed = 0;

  positions.forEach((position) => {
    const pnl = parseFloat(position.unrealizedPnl || '0') || 0;
    const marginUsed = parseFloat(position.marginUsed || '0') || 0;
    const returnOnEquity = parseFloat(position.returnOnEquity || '0') || 0;

    unrealizedPnl += pnl;
    weightedReturnOnEquity += returnOnEquity * marginUsed;
    totalMarginUsed += marginUsed;
  });

  return {
    unrealizedPnl: unrealizedPnl.toString(),
    returnOnEquity:
      totalMarginUsed > 0
        ? ((weightedReturnOnEquity / totalMarginUsed) * 100).toString()
        : '0',
  };
}
