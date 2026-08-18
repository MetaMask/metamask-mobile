import type { Position } from '@metamask/perps-controller';
import {
  estimateIsolatedLiquidationPriceFromEntry,
  estimateLiquidationPrice,
} from './marginUtils';
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
> & {
  maxLeverage?: number;
};

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
  /** Asset max leverage; used when the position does not carry `maxLeverage`. */
  maxLeverage?: number;
}

export interface PositionModifyPreview {
  isModifying: boolean;
  kind: PositionModifyKind | null;
  currentMargin: number;
  newMargin: number;
  currentLiquidationPrice: number;
  newLiquidationPrice: number;
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
  newLiquidationPrice: 0,
  resultingSize: 0,
  resultingEntryPrice: 0,
  resultingLeverage: 0,
  resultingDirection: 'long',
};

const resolveMaxLeverage = (
  positionMaxLeverage: number | undefined,
  fallbackMaxLeverage: number | undefined,
): number => {
  if (typeof positionMaxLeverage === 'number' && positionMaxLeverage > 0) {
    return positionMaxLeverage;
  }
  if (typeof fallbackMaxLeverage === 'number' && fallbackMaxLeverage > 0) {
    return fallbackMaxLeverage;
  }
  return 0;
};

const getResultingLiquidationPrice = ({
  kind,
  positionDirection,
  currentMargin,
  newMargin,
  currentSize,
  resultingSize,
  currentEntry,
  resultingEntry,
  currentLiquidationPrice,
  maxLeverage,
  resultingDirection,
}: {
  kind: PositionModifyKind;
  positionDirection: 'long' | 'short';
  currentMargin: number;
  newMargin: number;
  currentSize: number;
  resultingSize: number;
  currentEntry: number;
  resultingEntry: number;
  currentLiquidationPrice: number;
  maxLeverage: number;
  resultingDirection: 'long' | 'short';
}): number => {
  if (kind === 'full_close' || resultingSize <= 0 || newMargin <= 0) {
    return 0;
  }

  if (kind === 'flip') {
    return estimateIsolatedLiquidationPriceFromEntry({
      isLong: resultingDirection === 'long',
      entryPrice: resultingEntry,
      margin: newMargin,
      positionSize: resultingSize,
      maxLeverage,
    });
  }

  return estimateLiquidationPrice({
    isLong: positionDirection === 'long',
    currentMargin,
    newMargin,
    positionSize: currentSize,
    newPositionSize: resultingSize,
    currentLiquidationPrice,
    maxLeverage,
    currentEntryPrice: currentEntry,
    newEntryPrice: resultingEntry,
  });
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
 * @returns Current vs resulting margin, liquidation, size, entry, leverage, and direction.
 */
export const getModifiedPositionPreview = ({
  position,
  orderDirection,
  orderSize,
  orderMargin,
  orderPrice,
  reduceOnly,
  maxLeverage: fallbackMaxLeverage,
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
  const maxLeverage = resolveMaxLeverage(
    position.maxLeverage,
    fallbackMaxLeverage,
  );

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

  const openDirection: 'long' | 'short' = positionDirection;

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

  const withLiquidation = (
    preview: Omit<PositionModifyPreview, 'newLiquidationPrice'>,
  ): PositionModifyPreview => ({
    ...preview,
    newLiquidationPrice:
      preview.kind === null
        ? 0
        : getResultingLiquidationPrice({
            kind: preview.kind,
            positionDirection: openDirection,
            currentMargin,
            newMargin: preview.newMargin,
            currentSize,
            resultingSize: preview.resultingSize,
            currentEntry,
            resultingEntry: preview.resultingEntryPrice,
            currentLiquidationPrice,
            maxLeverage,
            resultingDirection: preview.resultingDirection,
          }),
  });

  if (safeOrderSize <= 0) {
    return withLiquidation({
      ...base,
      kind: openDirection === orderDirection ? 'increase' : 'decrease',
      newMargin: currentMargin,
      resultingSize: currentSize,
      resultingEntryPrice: currentEntry,
      resultingLeverage: fallbackLeverage,
      resultingDirection: openDirection,
    });
  }

  const isSameDirection = openDirection === orderDirection;

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

    return withLiquidation({
      ...base,
      kind: 'increase',
      newMargin,
      resultingSize,
      resultingEntryPrice,
      resultingLeverage,
      resultingDirection: openDirection,
    });
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

    return withLiquidation({
      ...base,
      kind: 'decrease',
      newMargin,
      resultingSize,
      resultingEntryPrice: currentEntry,
      resultingLeverage,
      resultingDirection: openDirection,
    });
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

    return withLiquidation({
      ...base,
      kind: 'flip',
      newMargin: leftoverMargin,
      resultingSize: leftover,
      resultingEntryPrice,
      resultingLeverage,
      resultingDirection: orderDirection,
    });
  }

  return withLiquidation({
    ...base,
    kind: 'full_close',
    newMargin: 0,
    resultingSize: 0,
    resultingEntryPrice: currentEntry,
    resultingLeverage: fallbackLeverage,
    resultingDirection: openDirection,
  });
};
