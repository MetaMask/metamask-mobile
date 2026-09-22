import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import {
  SubscriptionService,
  type PricingResponse,
} from '@metamask/subscription-controller';
import Logger from '../../../../../../util/Logger';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import {
  mapMoneyAccountPlusPricing,
  type MoneyAccountPlusPricingView,
} from '../utils/mapMoneyAccountPlusPricing';

export interface UseSubscriptionPricingResult {
  plusPricing: MoneyAccountPlusPricingView;
  isLoading: boolean;
  hasError: boolean;
  retry: () => void;
}

export const SUBSCRIPTION_PRICING_QUERY_KEY = [
  `${SubscriptionService.name}:getPricing`,
] as const;

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
 * Fetches Money Account Plus pricing through SubscriptionService via
 * react-data-query and maps it for the Pro plan-selection UI.
 *
 * @returns Mapped Plus pricing, fetch status, and a retry callback.
 */
export const useSubscriptionPricing = (): UseSubscriptionPricingResult => {
  const isUnlocked = useSelector(selectIsUnlocked);

  // Pause while locked so queryFn never reaches AuthenticationController
  // getBearerToken. Also disable automatic focus/reconnect refetches:
  // ReactQueryService wires AppState → focusManager, and react-data-query
  // uses staleTime: 0, so a foreground/reconnect can otherwise run queryFn
  // before React commits enabled:false after background auto-lock.
  const { data, isLoading, error, refetch } = useQuery<PricingResponse>({
    queryKey: SUBSCRIPTION_PRICING_QUERY_KEY,
    enabled: isUnlocked,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!error) {
      return;
    }

    const loggedError =
      error instanceof Error ? error : new Error(String(error));
    Logger.error(loggedError, PRICING_ERROR_LOG_OPTIONS);
  }, [error]);

  const plusPricing = useMemo(() => mapMoneyAccountPlusPricing(data), [data]);

  const retry = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  return {
    plusPricing,
    isLoading,
    hasError: Boolean(error),
    retry,
  };
};
