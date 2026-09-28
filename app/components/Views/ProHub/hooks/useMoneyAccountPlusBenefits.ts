import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  PLUS_BENEFIT_PRODUCT_COUNT,
  mapPlusBenefitsToTradeAllowances,
} from '../components/MemberPricingOnTrades/mapPlusBenefitsToTradeAllowances';
import type { TradeAllowanceItem } from '../ProHub.constants';
import { formatSubscriptionPeriodEnd } from '../ProHub.utils';
import Engine from '../../../../core/Engine';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import {
  selectIsMoneyAccountPlusSubscriber,
  selectMoneyAccountPlusSubscription,
  selectSubscriptionBenefits,
} from '../../../../selectors/subscriptionController';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccessState,
} from '../../../../hooks/useMoneyAccountPlusAccess';

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
 * Maps current-period Plus benefit usage for the Member pricing section.
 *
 * The subscriptions refresh already calls `getBenefits()` for active
 * subscribers and swallows its errors. This hook calls `getBenefits()` only
 * when that refresh settled without a snapshot, so a failure can show retry
 * instead of an empty section. Inactive statuses such as `past_due` never
 * fetch and keep cached meters.
 *
 * @returns Mapped trade-allowance rows and the shared reset date.
 */
export function useMoneyAccountPlusBenefits(): MoneyAccountPlusBenefits {
  const { access, isSubscriptionsSettled } = useMoneyAccountPlusAccessState();
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const isActiveSubscriber = useSelector(selectIsMoneyAccountPlusSubscriber);
  const benefits = useSelector(selectSubscriptionBenefits);
  const plusSubscription = useSelector(selectMoneyAccountPlusSubscription);
  const queryClient = useQueryClient();

  const isHubSubscriber = access === MoneyAccountPlusAccess.Subscriber;
  const canFetch = isActiveSubscriber && isSignedIn && isUnlocked;
  const hasCache = benefits !== undefined;

  const { isPending, isFetching, isError, refetch } = useQuery({
    queryKey: BENEFITS_QUERY_KEY,
    queryFn: () => Engine.context.SubscriptionController.getBenefits(),
    enabled: canFetch && isSubscriptionsSettled && !hasCache,
    retry: false,
    // Off so queryFn cannot run before enabled:false commits after auto-lock.
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
  const resetsOn = formatSubscriptionPeriodEnd(
    plusSubscription?.currentPeriodEnd,
  );

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
