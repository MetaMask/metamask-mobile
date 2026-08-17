import type { Position } from '@metamask/perps-controller';
import { getPositionDirection } from './positionCalculations';

/** Tolerance for token-size comparisons (covers floating-point / szDecimals noise). */
const SIZE_EPSILON = 1e-10;

export type PositionModifyKind =
  | 'increase'
  | 'decrease'
  | 'flip'
  | 'full_close';

export type PositionModifyPreviewSource = Pick<
  Position,
  'size' | 'marginUsed' | 'liquidationPrice' | 'entryPrice' | 'leverage'
>;

export interface PositionModifyPreviewInput {
  position: PositionModifyPreviewSource | null | undefined;
  orderDirection: 'long' | 'short';
  /** Proposed order size in token units. */
  orderSize: number;
  /** Isolated margin posted for the order (USD). */
  orderMargin: number;
  /** Fill / limit price used to average a new entry on increase/flip. */
  orderPrice: number;
  reduceOnly: boolean;
}

export interface PositionModifyPreview {
  isModifying: boolean;
  kind: PositionModifyKind | null;
  currentMargin: number;
  newMargin: number;
  currentLiquidationPrice: number;
  resultingSize: number;
  resultingEntryPrice: number;
  resultingLeverage: number;
  resultingDirection: 'long' | 'short';
}

const EMPTY_PREVIEW: PositionModifyPreview = {
  isModifying: false,
  kind: null,
  currentMargin: 0,
  newMargin: 0,
  currentLiquidationPrice: 0,
  resultingSize: 0,
  resultingEntryPrice: 0,
  resultingLeverage: 0,
  resultingDirection: 'long',
};

const parseFiniteNumber = (value: string | null | undefined): number =>
  Number.parseFloat(value ?? '');

/**
 * Formats a current → projected value for Pro order-form summary rows
 * (margin, estimated liquidation) when increasing or decreasing a position.
 *
 * @param before - Display string for the open position.
 * @param after - Display string after the proposed order.
 * @returns `{before} → {after}`
 */
export const formatBeforeAfterDisplay = (
  before: string,
  after: string,
): string => `${before} → ${after}`;

/**
 * Derives the resulting isolated position after an increase, reduce, or flip.
 * Returns `isModifying: false` when there is no open position to compare against.
 *
 * @param input - Live position plus the proposed order's size, margin, and price.
 * @returns Current vs resulting margin, size, entry, leverage, and direction.
 */
export const getModifiedPositionPreview = ({
  position,
  orderDirection,
  orderSize,
  orderMargin,
  orderPrice,
  reduceOnly,
}: PositionModifyPreviewInput): PositionModifyPreview => {
  if (!position) {
    return EMPTY_PREVIEW;
  }

  const positionDirection = getPositionDirection(position.size);
  const currentSize = Math.abs(parseFiniteNumber(position.size));
  const currentMargin = parseFiniteNumber(position.marginUsed);
  const currentLiquidationPrice = parseFiniteNumber(position.liquidationPrice);
  const currentEntry = parseFiniteNumber(position.entryPrice);
  const currentLeverage = position.leverage?.value ?? 0;

  if (
    positionDirection === 'unknown' ||
    !Number.isFinite(currentSize) ||
    currentSize <= 0 ||
    !Number.isFinite(currentMargin) ||
    currentMargin < 0 ||
    !Number.isFinite(currentLiquidationPrice) ||
    currentLiquidationPrice <= 0 ||
    !Number.isFinite(currentEntry) ||
    currentEntry <= 0
  ) {
    return EMPTY_PREVIEW;
  }

  const safeOrderSize =
    Number.isFinite(orderSize) && orderSize > 0 ? orderSize : 0;
  const safeOrderMargin =
    Number.isFinite(orderMargin) && orderMargin > 0 ? orderMargin : 0;
  const safeOrderPrice =
    Number.isFinite(orderPrice) && orderPrice > 0 ? orderPrice : 0;
  const fallbackLeverage =
    Number.isFinite(currentLeverage) && currentLeverage > 0
      ? currentLeverage
      : 1;

  const base = {
    isModifying: true as const,
    currentMargin,
    currentLiquidationPrice,
  };

  if (safeOrderSize <= 0) {
    return {
      ...base,
      kind: positionDirection === orderDirection ? 'increase' : 'decrease',
      newMargin: currentMargin,
      resultingSize: currentSize,
      resultingEntryPrice: currentEntry,
      resultingLeverage: fallbackLeverage,
      resultingDirection: positionDirection,
    };
  }

  const isSameDirection = positionDirection === orderDirection;

  if (isSameDirection && !reduceOnly) {
    const resultingSize = currentSize + safeOrderSize;
    const resultingEntryPrice =
      safeOrderPrice > 0
        ? (currentSize * currentEntry + safeOrderSize * safeOrderPrice) /
          resultingSize
        : currentEntry;
    const newMargin = currentMargin + safeOrderMargin;
    const resultingNotional = resultingSize * resultingEntryPrice;
    const resultingLeverage =
      newMargin > 0 && resultingNotional > 0
        ? resultingNotional / newMargin
        : fallbackLeverage;

    return {
      ...base,
      kind: 'increase',
      newMargin,
      resultingSize,
      resultingEntryPrice,
      resultingLeverage,
      resultingDirection: positionDirection,
    };
  }

  if (safeOrderSize + SIZE_EPSILON < currentSize) {
    const remainingRatio = (currentSize - safeOrderSize) / currentSize;
    const resultingSize = currentSize - safeOrderSize;
    const newMargin = currentMargin * remainingRatio;
    const resultingNotional = resultingSize * currentEntry;
    const resultingLeverage =
      newMargin > 0 && resultingNotional > 0
        ? resultingNotional / newMargin
        : fallbackLeverage;

    return {
      ...base,
      kind: 'decrease',
      newMargin,
      resultingSize,
      resultingEntryPrice: currentEntry,
      resultingLeverage,
      resultingDirection: positionDirection,
    };
  }

  const leftover = safeOrderSize - currentSize;
  if (leftover > SIZE_EPSILON && !reduceOnly) {
    const leftoverMargin =
      safeOrderSize > 0 ? safeOrderMargin * (leftover / safeOrderSize) : 0;
    const resultingEntryPrice =
      safeOrderPrice > 0 ? safeOrderPrice : currentEntry;
    const resultingNotional = leftover * resultingEntryPrice;
    const resultingLeverage =
      leftoverMargin > 0 && resultingNotional > 0
        ? resultingNotional / leftoverMargin
        : fallbackLeverage;

    return {
      ...base,
      kind: 'flip',
      newMargin: leftoverMargin,
      resultingSize: leftover,
      resultingEntryPrice,
      resultingLeverage,
      resultingDirection: orderDirection,
    };
  }

  return {
    ...base,
    kind: 'full_close',
    newMargin: 0,
    resultingSize: 0,
    resultingEntryPrice: currentEntry,
    resultingLeverage: fallbackLeverage,
    resultingDirection: positionDirection,
  };
};
