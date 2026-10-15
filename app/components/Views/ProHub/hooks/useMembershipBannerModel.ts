import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { Subscription } from '@metamask/subscription-controller';
import {
  selectDisplayedMoneyAccountPlusSubscription,
  selectMoneyAccountPlusSubscription,
} from '../../../../selectors/subscriptionController';
import {
  getMembershipBannerModel,
  type MembershipBannerModel,
} from '../components/MembershipBanner/MembershipBanner.utils';

export interface MembershipBannerControllerState {
  model: MembershipBannerModel;
  /** Subscription the banner describes. Current wins over the last one. */
  subscription: Subscription | undefined;
}

/**
 * Reads the Money Account Plus subscription and maps it to the membership card.
 *
 * @returns The banner model and the subscription it was derived from.
 */
export function useMembershipBannerModel(): MembershipBannerControllerState {
  const current = useSelector(selectMoneyAccountPlusSubscription);
  const displayed = useSelector(selectDisplayedMoneyAccountPlusSubscription);
  const model = useMemo(
    () => getMembershipBannerModel({ current, displayed }),
    [current, displayed],
  );

  return { model, subscription: current ?? displayed };
}
