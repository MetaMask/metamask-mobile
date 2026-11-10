import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SUBSCRIPTION_STATUSES,
  SubscriptionControllerErrorMessage,
} from '@metamask/subscription-controller';
import { useSelector } from 'react-redux';
import {
  PLUS_BENEFIT_PRODUCT_COUNT,
  mapPlusBenefitsToTradeAllowances,
} from '../components/MemberPricingOnTrades/mapPlusBenefitsToTradeAllowances';
import type { TradeAllowanceItem } from '../ProHub.constants';
import { formatSubscriptionPeriodEnd } from '../ProHub.utils';
import Engine from '../../../../core/Engine';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
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
  /**
   * Provisional membership is stored, but the benefits ledger is not eligible
   * yet. The section explains that pricing starts once membership is confirmed.
   */
  Pending = 'pending',
  /**
   * An active or trialing member whose benefits response says they are not
   * eligible. This is a mismatch, not a load failure.
   */
  Unavailable = 'unavailable',
  Failed = 'failed',
}

export interface MoneyAccountPlusBenefits {
  status: MoneyAccountPlusBenefitsStatus;
  items: TradeAllowanceItem[];
  resetsOn: string | undefined;
  retry: () => void;
}

/**
 * Maps current-period Plus benefit usage for Member pricing.
 *
 * getSubscriptions() already fetches benefits for active subscribers and
 * clears state.benefits for any other status (past_due, etc). This hook only
 * fetches when that refresh left no snapshot. Non-active subscribers get
 * Empty so we don't render a snapshot core is about to delete. A provisional
 * subscriber whose benefits response is not eligible, or fails validation
 * because usage fields are omitted, gets Pending. An active or trialing
 * subscriber whose response is still not eligible gets Unavailable.
 * Subscription status is part of the benefits query key, so confirming a
 * provisional membership fetches again instead of reusing that error.
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

  const { isPending, isFetching, isError, error, refetch } = useQuery({
    // A cached UserNotSubscribed or StructError belongs to the status that
    // produced it. Confirming a provisional membership must not reuse it.
    queryKey: [...BENEFITS_QUERY_KEY, plusSubscription?.status],
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

  const isUserNotSubscribedError =
    error instanceof Error &&
    error.message === SubscriptionControllerErrorMessage.UserNotSubscribed;
  // A provisional response omits required usage fields. superstruct throws
  // before the controller can read `eligible`.
  const isIncompleteBenefitsResponse =
    error instanceof Error && error.name === 'StructError';
  const isConfirmedMember =
    plusSubscription?.status === SUBSCRIPTION_STATUSES.active ||
    plusSubscription?.status === SUBSCRIPTION_STATUSES.trialing;
  const isConfirmedMemberNotEligible =
    !hasCache &&
    canFetch &&
    isError &&
    isUserNotSubscribedError &&
    isConfirmedMember;

  useEffect(() => {
    if (!isConfirmedMemberNotEligible) {
      return;
    }

    Logger.error(
      ensureError(error, 'useMoneyAccountPlusBenefits.getBenefits'),
      {
        tags: {
          feature: 'money_account_plus',
          operation: 'benefits_not_eligible',
        },
      },
    );
  }, [isConfirmedMemberNotEligible, error]);

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

  // past_due etc: core wipes benefits on the subscriptions refresh
  if (!isActiveSubscriber) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Empty,
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

  // getBenefits() throws UserNotSubscribed when the response is not eligible.
  // A provisional response can also fail validation because usage fields are
  // omitted. Either way the membership is still being confirmed. A confirmed
  // member who is reported not eligible is a mismatch with the benefits ledger.
  if (
    !hasCache &&
    canFetch &&
    isError &&
    plusSubscription?.status === SUBSCRIPTION_STATUSES.provisional &&
    (isUserNotSubscribedError || isIncompleteBenefitsResponse)
  ) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Pending,
      items: [],
      resetsOn: undefined,
      retry,
    };
  }

  if (
    !hasCache &&
    canFetch &&
    isError &&
    isUserNotSubscribedError &&
    isConfirmedMember
  ) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Unavailable,
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
