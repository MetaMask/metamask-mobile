import { useEffect, useRef, useState } from 'react';
import type {
  MarginAdjustmentLimits,
  PerpsProviderType,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  MARGIN_LIMITS_MAX_RETRIES,
  MARGIN_LIMITS_SETTLED_BALANCE_STEP_USD,
} from '../constants/perpsConfig';
import { useRetryOnPriceTick } from './useRetryOnPriceTick';

interface UsePerpsMarginAdjustmentLimitsParams {
  symbol: string;
  providerId?: PerpsProviderType;
  /** Selected account and network; another one drops the last limits. */
  contextKey: string;
  /** Size, entry, leverage and collateral of the position; not its PnL. */
  positionKey: string;
  /** Account equity net of unrealized PnL: moves with deposits, not prices. */
  settledBalance: number | undefined;
  /** Moves with every price update; retries a failed read. */
  priceTick: number | undefined;
  enabled: boolean;
}

/**
 * The margin the venue lets an isolated position take in and release. Core
 * reads the venue on every call, so limits are read when the form opens and
 * when the position or the settled balance changes, never on a timer. A failed
 * read is retried on later price frames, a bounded number of times.
 *
 * @param params - Position, account context and refresh inputs.
 * @returns The last limits for this position, or undefined before the first.
 */
export const usePerpsMarginAdjustmentLimits = ({
  symbol,
  providerId,
  contextKey,
  positionKey,
  settledBalance,
  priceTick,
  enabled,
}: UsePerpsMarginAdjustmentLimitsParams):
  | MarginAdjustmentLimits
  | undefined => {
  const targetKey = `${contextKey}|${providerId ?? ''}|${symbol}`;
  const [result, setResult] = useState<{
    targetKey: string;
    limits: MarginAdjustmentLimits;
  }>();

  // Total and PnL can arrive from different frames, so ignore small steps.
  const settledRef = useRef<number | undefined>(undefined);
  if (
    settledBalance !== undefined &&
    (settledRef.current === undefined ||
      Math.abs(settledBalance - settledRef.current) >=
        MARGIN_LIMITS_SETTLED_BALANCE_STEP_USD)
  ) {
    settledRef.current = settledBalance;
  }
  const settledStep = settledRef.current;

  const isRetryable =
    enabled &&
    result?.targetKey === targetKey &&
    result.limits.status === 'unavailable' &&
    result.limits.reason === 'account_unknown';
  const retryCount = useRef(0);
  const lastAttempt = useRef(0);
  const attempt = useRetryOnPriceTick(
    isRetryable && retryCount.current < MARGIN_LIMITS_MAX_RETRIES,
    priceTick,
  );

  useEffect(() => {
    if (!enabled || !symbol) {
      return undefined;
    }
    let isCurrent = true;
    retryCount.current =
      attempt === lastAttempt.current ? 0 : retryCount.current + 1;
    lastAttempt.current = attempt;
    Engine.context.PerpsController.getMarginAdjustmentLimits({
      symbol,
      providerId,
    })
      .then((limits) => {
        if (isCurrent) {
          setResult({ targetKey, limits });
        }
      })
      .catch((error) => {
        DevLogger.log('Margin adjustment limits unavailable:', error);
      });
    return () => {
      isCurrent = false;
    };
  }, [
    enabled,
    symbol,
    providerId,
    targetKey,
    positionKey,
    settledStep,
    attempt,
  ]);

  return enabled && result?.targetKey === targetKey ? result.limits : undefined;
};
