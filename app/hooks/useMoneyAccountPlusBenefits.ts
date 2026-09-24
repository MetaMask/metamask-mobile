import { useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  PLUS_BENEFIT_PRODUCT_COUNT,
  formatPlusPeriodEnd,
  mapPlusBenefitsToTradeAllowances,
} from '../components/Views/ProHub/components/MemberPricingOnTrades/mapPlusBenefitsToTradeAllowances';
import type { TradeAllowanceItem } from '../components/Views/ProHub/ProHub.constants';
import Engine from '../core/Engine';
import { selectIsSignedIn } from '../selectors/identity';
import { selectIsUnlocked } from '../selectors/keyringController';
import {
  selectMoneyAccountPlusSubscription,
  selectSubscriptionBenefits,
} from '../selectors/subscriptionController';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';

export const BENEFITS_QUERY_KEY = [
  'SubscriptionController:getBenefits',
] as const;

/**
 * Presentation state for the Member pricing on trades section.
 */
export enum MoneyAccountPlusBenefitsStatus {
  Loading = 'loading',
  Ready = 'ready',
  Incomplete = 'incomplete',
  Empty = 'empty',
  Failed = 'failed',
}

export interface MoneyAccountPlusBenefits {
  status: MoneyAccountPlusBenefitsStatus;
  items: TradeAllowanceItem[];
  resetsOn: string | undefined;
  isRefreshing: boolean;
  hasError: boolean;
  retry: () => void;
}

/**
 * Loads current-period Plus benefit usage through SubscriptionController.
 *
 * `getBenefits()` is only called for entitled subscribers. Cached
 * `state.benefits` stays visible during a refresh or a failed refresh; an
 * error with no cache surfaces retry UI instead of paid meters.
 *
 * Fetch lifecycle is owned by TanStack Query. Redux remains the source of
 * truth for mapped meters — the controller persists `state.benefits` with no
 * loading flag, and subscription polling swallows benefits errors.
 *
 * @returns Mapped trade-allowance rows and the shared reset date.
 */
export function useMoneyAccountPlusBenefits(): MoneyAccountPlusBenefits {
  const access = useMoneyAccountPlusAccess();
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const benefits = useSelector(selectSubscriptionBenefits);
  const plusSubscription = useSelector(selectMoneyAccountPlusSubscription);
  const queryClient = useQueryClient();

  const isSubscriber = access === MoneyAccountPlusAccess.Subscriber;
  const canFetch = isSubscriber && isSignedIn && isUnlocked;

  const { isPending, isFetching, isError, refetch } = useQuery({
    queryKey: BENEFITS_QUERY_KEY,
    queryFn: () => Engine.context.SubscriptionController.getBenefits(),
    enabled: canFetch,
    retry: false,
    // Focus and reconnect refetches stay off because they can run queryFn —
    // and so reach AuthenticationController getBearerToken — before React
    // commits enabled:false after a background auto-lock.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!isSignedIn || !isUnlocked) {
      queryClient.removeQueries({ queryKey: BENEFITS_QUERY_KEY });
    }
  }, [isSignedIn, isUnlocked, queryClient]);

  useFocusEffect(
    useCallback(() => {
      if (!canFetch) {
        return;
      }

      refetch().catch(() => {
        // Query status already reflects the failure.
      });
    }, [canFetch, refetch]),
  );

  const retry = useCallback(() => {
    refetch().catch(() => {
      // Query status already reflects the failure.
    });
  }, [refetch]);

  const items = useMemo(
    () => mapPlusBenefitsToTradeAllowances(benefits),
    [benefits],
  );
  const resetsOn = formatPlusPeriodEnd(plusSubscription?.currentPeriodEnd);
  const hasCache = benefits !== undefined;

  if (!isSubscriber) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Loading,
      items: [],
      resetsOn: undefined,
      isRefreshing: false,
      hasError: false,
      retry,
    };
  }

  if (!hasCache && !isError && (isPending || isFetching)) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Loading,
      items: [],
      resetsOn: undefined,
      isRefreshing: true,
      hasError: false,
      retry,
    };
  }

  if (!hasCache && isError) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Failed,
      items: [],
      resetsOn: undefined,
      isRefreshing: false,
      hasError: true,
      retry,
    };
  }

  if (items.length === 0) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Empty,
      items: [],
      resetsOn,
      isRefreshing: isFetching,
      hasError: isError,
      retry,
    };
  }

  return {
    status:
      items.length < PLUS_BENEFIT_PRODUCT_COUNT
        ? MoneyAccountPlusBenefitsStatus.Incomplete
        : MoneyAccountPlusBenefitsStatus.Ready,
    items,
    resetsOn,
    isRefreshing: isFetching,
    hasError: isError,
    retry,
  };
}
