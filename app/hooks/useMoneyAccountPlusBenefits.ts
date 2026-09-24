import { useCallback, useEffect, useMemo } from 'react';
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
  selectIsMoneyAccountPlusSubscriber,
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
  retry: () => void;
}

/**
 * Loads current-period Plus benefit usage through SubscriptionController.
 *
 * `getBenefits()` is only called for active Plus subscribers. Core rejects
 * the call (and clears `state.benefits`) for entitled-but-inactive statuses
 * such as `past_due`, so those users keep cached meters instead of fetching.
 *
 * Cached `state.benefits` stays visible during a refresh or a failed refresh;
 * an error with no cache surfaces retry UI instead of paid meters.
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
  const isActiveSubscriber = useSelector(selectIsMoneyAccountPlusSubscriber);
  const benefits = useSelector(selectSubscriptionBenefits);
  const plusSubscription = useSelector(selectMoneyAccountPlusSubscription);
  const queryClient = useQueryClient();

  const isHubSubscriber = access === MoneyAccountPlusAccess.Subscriber;
  const canFetch = isActiveSubscriber && isSignedIn && isUnlocked;

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

  if (!isHubSubscriber) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Loading,
      items: [],
      resetsOn: undefined,
      retry,
    };
  }

  if (!hasCache && canFetch && !isError && (isPending || isFetching)) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Loading,
      items: [],
      resetsOn: undefined,
      retry,
    };
  }

  if (!hasCache && canFetch && isError) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Failed,
      items: [],
      resetsOn: undefined,
      retry,
    };
  }

  if (items.length === 0) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Empty,
      items: [],
      resetsOn,
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
    retry,
  };
}
