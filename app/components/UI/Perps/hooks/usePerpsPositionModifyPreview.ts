import { debounce } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Position,
  PositionModifyPreviewParams,
  PositionModifyPreviewResult,
  PerpsProviderType,
} from '@metamask/perps-controller';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTrading } from './usePerpsTrading';

const IDLE_PREVIEW: PositionModifyPreviewResult = { status: 'none' };

export interface UsePerpsPositionModifyPreviewParams {
  position: Position | null | undefined;
  direction: 'long' | 'short';
  /** Proposed order size in token units. */
  size: string;
  /** Expected fill or resting limit price. */
  price: string;
  /** Isolated leverage applied to the whole resulting position. */
  leverage: number;
  reduceOnly: boolean;
  /** Estimated trading fees in USD; deducted on increases and flips. */
  feeAmountUsd?: number;
  providerId?: PerpsProviderType;
  /**
   * When false, skips the controller call and returns `{ status: 'none' }`.
   * Use for multi-fill order types (Scale/TWAP) that this preview models poorly.
   */
  enabled?: boolean;
}

export interface UsePerpsPositionModifyPreviewOptions {
  debounceMs?: number;
}

/**
 * Projects the position that would remain after a proposed order via
 * `PerpsController.previewPositionModify` (HyperLiquid isolated math).
 *
 * Margin and liquidation availability are independent on the result. Use
 * `resulting.direction` (not the order direction) when validating TP/SL
 * against the projected liquidation.
 *
 * In-flight requests are generation-tagged so a slower older response cannot
 * overwrite a newer preview. The last successful preview is kept until the
 * next result arrives (no idle flash on every param tick).
 *
 * Live prices and fees re-request the preview roughly every second. Pass
 * `debounceMs` (Pro uses `PERFORMANCE_CONFIG.ValidationDebounceMs`) so those
 * ticks coalesce; `isCalculating` is otherwise true most of the time a position
 * is open. Gate submission on `isAwaitingFirstPreview`, which is only true
 * until a result exists for the current position.
 */
export const usePerpsPositionModifyPreview = (
  params: UsePerpsPositionModifyPreviewParams,
  options?: UsePerpsPositionModifyPreviewOptions,
) => {
  const { previewPositionModify } = usePerpsTrading();
  const [preview, setPreview] =
    useState<PositionModifyPreviewResult>(IDLE_PREVIEW);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasSettledPreview, setHasSettledPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestGeneration = useRef(0);

  const debounceMs = options?.debounceMs ?? 0;
  const {
    position,
    direction,
    size,
    price,
    leverage,
    reduceOnly,
    feeAmountUsd,
    providerId,
    enabled = true,
  } = params;

  const positionRef = useRef(position);
  positionRef.current = position;

  // Streamed Position objects get a new identity on every tick. Key on the
  // fields that actually change isolated resize math so PnL-only updates do
  // not cancel in-flight previews.
  const positionKey = position
    ? [
        position.symbol,
        position.size,
        position.entryPrice,
        position.marginUsed,
        position.liquidationPrice ?? '',
        position.leverage.type,
        String(position.leverage.value),
        position.providerId ?? '',
      ].join('|')
    : '';

  const requestParams = useMemo((): PositionModifyPreviewParams | null => {
    const currentPosition = positionRef.current;
    if (!enabled || !currentPosition || positionKey.length === 0) {
      return null;
    }

    return {
      position: currentPosition,
      direction,
      size,
      price,
      leverage,
      reduceOnly,
      feeAmountUsd,
      providerId: providerId ?? currentPosition.providerId,
    };
  }, [
    enabled,
    positionKey,
    direction,
    size,
    price,
    leverage,
    reduceOnly,
    feeAmountUsd,
    providerId,
  ]);

  const runPreview = useMemo(
    () =>
      debounce(
        async (
          nextParams: PositionModifyPreviewParams | null,
          generation: number,
        ) => {
          if (generation !== requestGeneration.current) {
            return;
          }

          if (!nextParams) {
            setPreview(IDLE_PREVIEW);
            setIsCalculating(false);
            setError(null);
            return;
          }

          try {
            setIsCalculating(true);
            setError(null);
            const result = await previewPositionModify(nextParams);
            if (generation !== requestGeneration.current) {
              return;
            }
            setPreview(result);
          } catch (err) {
            if (generation !== requestGeneration.current) {
              return;
            }
            DevLogger.log('Error previewing position modify:', err);
            setError(
              err instanceof Error
                ? err.message
                : 'Failed to preview position modify',
            );
            setPreview(IDLE_PREVIEW);
          } finally {
            if (generation === requestGeneration.current) {
              setIsCalculating(false);
              setHasSettledPreview(true);
            }
          }
        },
        debounceMs,
      ),
    [previewPositionModify, debounceMs],
  );

  const previewTarget =
    enabled && position
      ? `${providerId ?? position.providerId ?? ''}:${position.symbol}`
      : null;

  useEffect(() => {
    // A different position invalidates the retained preview, so the next
    // request counts as a first load again. Order/price changes do not.
    setPreview(IDLE_PREVIEW);
    setHasSettledPreview(false);
  }, [previewTarget]);

  useEffect(() => {
    const generation = ++requestGeneration.current;

    if (requestParams) {
      // Keep the last preview while recalculating so before→after / TP/SL do
      // not flicker to idle on every price or fee tick.
      setIsCalculating(true);
    } else {
      setPreview(IDLE_PREVIEW);
      setIsCalculating(false);
      setError(null);
    }

    runPreview(requestParams, generation);

    return () => {
      runPreview.cancel();
      if (requestGeneration.current === generation) {
        requestGeneration.current += 1;
      }
    };
  }, [requestParams, runPreview]);

  return {
    preview,
    isCalculating,
    isAwaitingFirstPreview: isCalculating && !hasSettledPreview,
    error,
  };
};
