import { useEffect, useMemo, useState } from 'react';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type {
  CrossLiquidationEstimate,
  LiquidationPriceParams,
} from '@metamask/perps-controller';
import { usePerpsTrading } from './usePerpsTrading';
import { useRetryOnPriceTick } from './useRetryOnPriceTick';

interface LiquidationPriceOptions {
  debounceMs?: number;
  /** Selected wallet and network for an account-aware preview. */
  contextKey?: string;
  /** Streamed account figures a Cross estimate depends on. */
  accountKey?: string;
  /** Moves with every price update; retries an unknown-account Cross estimate. */
  priceTick?: number;
}

/**
 * Requests an estimate for the current inputs and ignores results from an
 * earlier order draft or trading context. A Cross order is estimated from the
 * account's collateral: `isCoveredByAccount` means no price liquidates it.
 */
export const usePerpsLiquidationPrice = (
  params: LiquidationPriceParams,
  {
    debounceMs = 0,
    contextKey,
    accountKey,
    priceTick,
  }: LiquidationPriceOptions = {},
) => {
  const { calculateLiquidationPrice } = usePerpsTrading();
  const {
    entryPrice,
    leverage,
    direction,
    asset,
    marginType = 'isolated',
    positionSize,
    providerId,
  } = params;
  const request = useMemo(
    () => ({
      contextKey,
      accountKey,
      params: {
        entryPrice,
        leverage,
        direction,
        asset,
        marginType,
        ...(positionSize !== undefined && { positionSize }),
        ...(providerId !== undefined && { providerId }),
      },
    }),
    [
      contextKey,
      accountKey,
      entryPrice,
      leverage,
      direction,
      asset,
      marginType,
      positionSize,
      providerId,
    ],
  );
  const [result, setResult] = useState<{
    request: typeof request;
    price?: string;
    crossEstimate?: CrossLiquidationEstimate;
    error: string | null;
  }>();
  const canEstimate =
    !!asset &&
    Number.isFinite(entryPrice) &&
    entryPrice > 0 &&
    Number.isFinite(leverage) &&
    leverage >= 1 &&
    (marginType !== 'cross' ||
      (positionSize !== undefined &&
        Number.isFinite(positionSize) &&
        positionSize > 0));
  const isAccountUnknown =
    canEstimate &&
    result?.request === request &&
    result.crossEstimate?.status === 'unavailable' &&
    result.crossEstimate.reason === 'account_unknown';
  const attempt = useRetryOnPriceTick(isAccountUnknown, priceTick);

  useEffect(() => {
    if (!canEstimate) return;

    let current = true;
    const updateEstimate = async () => {
      try {
        const { params: requested } = request;
        if (requested.marginType === 'cross') {
          const crossEstimate =
            await Engine.context.PerpsController.estimateCrossLiquidation({
              symbol: requested.asset ?? '',
              direction: requested.direction,
              size: String(requested.positionSize),
              entryPrice: String(requested.entryPrice),
              leverage: requested.leverage,
              providerId: requested.providerId,
            });
          if (current) {
            setResult({
              request,
              price:
                crossEstimate.status === 'price'
                  ? crossEstimate.price
                  : undefined,
              crossEstimate,
              error: null,
            });
          }
          return;
        }
        const price = await calculateLiquidationPrice(requested);
        if (current) setResult({ request, price, error: null });
      } catch (err) {
        if (!current) return;
        DevLogger.log('Error calculating liquidation price:', err);
        setResult({
          request,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to calculate liquidation price',
        });
      }
    };
    const timeout = setTimeout(() => {
      void updateEstimate();
    }, debounceMs);
    return () => {
      current = false;
      clearTimeout(timeout);
    };
  }, [request, canEstimate, calculateLiquidationPrice, debounceMs, attempt]);

  const currentResult =
    canEstimate && result?.request === request ? result : undefined;
  // While the draft or the account only reprices, keep its last quote instead of flashing a
  // placeholder; a quote for another account, market, venue, side, leverage or
  // size never shows.
  const lastResult =
    canEstimate &&
    result !== undefined &&
    result.request.contextKey === contextKey &&
    result.request.params.asset === asset &&
    result.request.params.providerId === providerId &&
    result.request.params.direction === direction &&
    result.request.params.marginType === marginType &&
    result.request.params.leverage === leverage &&
    result.request.params.positionSize === positionSize
      ? result
      : undefined;
  const shownResult = currentResult ?? lastResult;
  return {
    liquidationPrice: shownResult?.price,
    isCoveredByAccount: shownResult?.crossEstimate?.status === 'none',
    isCalculating: canEstimate && currentResult === undefined,
    error: currentResult?.error ?? null,
  };
};
