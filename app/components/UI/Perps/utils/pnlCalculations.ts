/**
 * P&L calculation utilities for Perps trading
 */

import {
  calculateWeightedReturnOnEquity,
  type Position,
} from '@metamask/perps-controller';

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
 * @returns The sum of unrealized P&L across all positions, or `undefined`
 * when any position's P&L is unknown
 */
export function calculateTotalPnL(params: TotalPnLParams): number | undefined {
  const { positions } = params;
  let total = 0;
  for (const position of positions) {
    const pnl = parseFloat(position.unrealizedPnl);
    if (!Number.isFinite(pnl)) {
      return undefined;
    }
    total += pnl;
  }
  return total;
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
  /** Σ unrealizedPnl across the given positions; `undefined` while any is unknown */
  unrealizedPnl: string | undefined;
  /**
   * Margin-weighted ROE as a percentage string (e.g. `"15"` for 15%), from
   * Core `calculateWeightedReturnOnEquity` over each position's protocol
   * decimal ROE (0.10 = 10%) weighted by its `marginUsed`. `undefined` while
   * any position's PnL, ROE or margin is unknown.
   */
  returnOnEquity: string | undefined;
}

/**
 * Aggregate unrealized P&L and margin-weighted ROE for a position subset
 * (e.g. ticker-filtered Pro positions). A position with an unknown figure
 * leaves both totals unknown instead of counting it as zero.
 */
export function calculatePositionAggregateTotals(
  positions: Position[],
): PositionAggregateTotals {
  const hasUnknownFigure = positions.some(
    ({ unrealizedPnl, returnOnEquity, marginUsed }) =>
      [unrealizedPnl, returnOnEquity, marginUsed].some(
        (value) => !Number.isFinite(parseFloat(value)),
      ),
  );
  if (hasUnknownFigure) {
    return { unrealizedPnl: undefined, returnOnEquity: undefined };
  }

  const unrealizedPnl = calculateTotalPnL({ positions });
  const weightedReturnOnEquity = calculateWeightedReturnOnEquity(
    positions.map(({ unrealizedPnl: pnl, returnOnEquity, marginUsed }) => ({
      unrealizedPnl: pnl,
      returnOnEquity,
      marginUsed,
    })),
  );

  return {
    unrealizedPnl: unrealizedPnl?.toString(),
    returnOnEquity: (parseFloat(weightedReturnOnEquity) * 100).toString(),
  };
}
