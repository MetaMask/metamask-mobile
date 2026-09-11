import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  PLUS_BENEFIT_PRODUCT_COUNT,
  formatPlusPeriodEnd,
  mapPlusBenefitsToTradeAllowances,
} from '../components/Views/ProHub/components/MemberPricingOnTrades/mapPlusBenefitsToTradeAllowances';
import type { TradeAllowanceItem } from '../components/Views/ProHub/ProHub.constants';
import {
  ensureResolved,
  getSnapshot,
  refresh,
  reset,
  subscribe,
} from '../core/Subscription/benefitsResolution';
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
 * @returns Mapped trade-allowance rows and the shared reset date.
 */
export function useMoneyAccountPlusBenefits(): MoneyAccountPlusBenefits {
  const access = useMoneyAccountPlusAccess();
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const benefits = useSelector(selectSubscriptionBenefits);
  const plusSubscription = useSelector(selectMoneyAccountPlusSubscription);
  const resolutionStatus = useSyncExternalStore(subscribe, getSnapshot);

  const isSubscriber = access === MoneyAccountPlusAccess.Subscriber;

  useEffect(() => {
    if (!isSignedIn || !isUnlocked) {
      reset();
    }
  }, [isSignedIn, isUnlocked]);

  useEffect(() => {
    if (!isSubscriber) {
      return;
    }

    ensureResolved().catch(() => {
      // Status is already recorded as `error` by the store.
    });
  }, [isSubscriber]);

  useFocusEffect(
    useCallback(() => {
      if (!isSubscriber) {
        return;
      }

      refresh().catch(() => {
        // Status is already recorded as `error` by the store.
      });
    }, [isSubscriber]),
  );

  const retry = useCallback(() => {
    refresh().catch(() => {
      // Status is already recorded as `error` by the store.
    });
  }, []);

  const items = useMemo(
    () => mapPlusBenefitsToTradeAllowances(benefits),
    [benefits],
  );
  const resetsOn = formatPlusPeriodEnd(plusSubscription?.currentPeriodEnd);
  const hasCache = benefits !== undefined;
  const isUnresolved =
    resolutionStatus === 'idle' || resolutionStatus === 'loading';

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

  if (!hasCache && isUnresolved) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Loading,
      items: [],
      resetsOn: undefined,
      isRefreshing: true,
      hasError: false,
      retry,
    };
  }

  if (!hasCache && resolutionStatus === 'error') {
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
      isRefreshing: isUnresolved,
      hasError: resolutionStatus === 'error',
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
    isRefreshing: isUnresolved,
    hasError: resolutionStatus === 'error',
    retry,
  };
}
