import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  PLUS_BENEFIT_PRODUCT_COUNT,
  formatPlusPeriodEnd,
  mapPlusBenefitsToTradeAllowances,
} from '../components/Views/ProHub/components/MemberPricingOnTrades/mapPlusBenefitsToTradeAllowances';
import type { TradeAllowanceItem } from '../components/Views/ProHub/ProHub.constants';
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
  Ready = 'ready',
  Incomplete = 'incomplete',
  Empty = 'empty',
}

export interface MoneyAccountPlusBenefits {
  status: MoneyAccountPlusBenefitsStatus;
  items: TradeAllowanceItem[];
  resetsOn: string | undefined;
}

/**
 * Maps persisted Plus benefit usage from SubscriptionController.
 *
 * Fetch status is not tracked here. Missing cache is empty until Core
 * hydrates `state.benefits`.
 *
 * @returns Mapped trade-allowance rows and the shared reset date.
 */
export function useMoneyAccountPlusBenefits(): MoneyAccountPlusBenefits {
  const access = useMoneyAccountPlusAccess();
  const benefits = useSelector(selectSubscriptionBenefits);
  const plusSubscription = useSelector(selectMoneyAccountPlusSubscription);

  const items = useMemo(
    () => mapPlusBenefitsToTradeAllowances(benefits),
    [benefits],
  );
  const resetsOn = formatPlusPeriodEnd(plusSubscription?.currentPeriodEnd);

  if (access !== MoneyAccountPlusAccess.Subscriber || items.length === 0) {
    return {
      status: MoneyAccountPlusBenefitsStatus.Empty,
      items: [],
      resetsOn:
        access === MoneyAccountPlusAccess.Subscriber ? resetsOn : undefined,
    };
  }

  return {
    status:
      items.length < PLUS_BENEFIT_PRODUCT_COUNT
        ? MoneyAccountPlusBenefitsStatus.Incomplete
        : MoneyAccountPlusBenefitsStatus.Ready,
    items,
    resetsOn,
  };
}
