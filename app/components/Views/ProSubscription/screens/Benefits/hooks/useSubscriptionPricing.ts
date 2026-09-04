import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { PricingResponse } from '@metamask/subscription-controller';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { selectSubscriptionPricing } from '../../../../../../selectors/subscriptionController';

export interface UseSubscriptionPricingResult {
  pricing: PricingResponse | undefined;
  isLoading: boolean;
  hasError: boolean;
  retry: () => void;
}

const PRICING_ERROR_LOG_OPTIONS = {
  tags: {
    feature: 'pro-subscription',
  },
  context: {
    name: 'subscription_pricing',
    data: {
      method: 'getPricing',
    },
  },
} as const;

/**
 * Fetches Money Account Plus pricing through SubscriptionController and
 * exposes loading, error, and retry state for the Pro plan-selection UI.
 *
 * Duplicate in-flight requests are ignored. Prices stay in controller state
 * and are read via {@link selectSubscriptionPricing}.
 *
 * @returns Cached pricing, fetch status, and a retry callback.
 */
export const useSubscriptionPricing = (): UseSubscriptionPricingResult => {
  const pricing = useSelector(selectSubscriptionPricing);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const inFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  const fetchPricing = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);
    setHasError(false);

    try {
      await Engine.context.SubscriptionController.getPricing();
    } catch (error) {
      const loggedError =
        error instanceof Error ? error : new Error(String(error));
      Logger.error(loggedError, PRICING_ERROR_LOG_OPTIONS);
      if (isMountedRef.current) {
        setHasError(true);
      }
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPricing();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPricing]);

  return {
    pricing,
    isLoading,
    hasError,
    retry: fetchPricing,
  };
};
