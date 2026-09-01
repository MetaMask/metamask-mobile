import { debounce } from 'lodash';
import { useEffect, useMemo, useState } from 'react';
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
 */
export const usePerpsPositionModifyPreview = (
  params: UsePerpsPositionModifyPreviewParams,
  options?: UsePerpsPositionModifyPreviewOptions,
) => {
  const { previewPositionModify } = usePerpsTrading();
  const [preview, setPreview] =
    useState<PositionModifyPreviewResult>(IDLE_PREVIEW);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const requestParams = useMemo((): PositionModifyPreviewParams | null => {
    if (!enabled || !position) {
      return null;
    }

    return {
      position,
      direction,
      size,
      price,
      leverage,
      reduceOnly,
      feeAmountUsd,
      providerId: providerId ?? position.providerId,
    };
  }, [
    enabled,
    position,
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
      debounce(async (nextParams: PositionModifyPreviewParams | null) => {
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
          setPreview(result);
        } catch (err) {
          DevLogger.log('Error previewing position modify:', err);
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to preview position modify',
          );
          setPreview(IDLE_PREVIEW);
        } finally {
          setIsCalculating(false);
        }
      }, debounceMs),
    [previewPositionModify, debounceMs],
  );

  useEffect(() => {
    if (requestParams) {
      setIsCalculating(true);
    } else {
      setPreview(IDLE_PREVIEW);
      setIsCalculating(false);
      setError(null);
    }

    runPreview(requestParams);

    return () => {
      runPreview.cancel();
    };
  }, [requestParams, runPreview]);

  return {
    preview,
    isCalculating,
    error,
  };
};
