import { useSelector } from 'react-redux';
import {
  selectActiveTab,
  selectReferralCode,
  selectBalanceTotal,
  selectReferralCount,
  selectSubscriptionId,
  selectCurrentTierId,
  selectBalanceRefereePortion,
  selectBalanceUpdatedAt,
} from '../../../../reducers/rewards/selectors';

export interface UseRewardsStoreResult {
  activeTab: 'activity' | 'levels' | 'overview' | null;
  subscription: {
    subscriptionId: string | null;
    currentTierId: string | null;
  };
  balance: {
    total: number | null;
    refereePortion: number | null;
    updatedAt: Date | null;
  };
  referralDetails: {
    referralCode: string | null;
    refereeCount: number;
    earnedPointsFromReferees: number | null;
  };
}

export const useRewardsStore = (): UseRewardsStoreResult => {
  const activeTab = useSelector(selectActiveTab);
  const referralCode = useSelector(selectReferralCode);
  const balanceTotal = useSelector(selectBalanceTotal);
  const referralCount = useSelector(selectReferralCount);
  const subscriptionId = useSelector(selectSubscriptionId);
  const currentTierId = useSelector(selectCurrentTierId);
  const balanceRefereePortion = useSelector(selectBalanceRefereePortion);
  const balanceUpdatedAt = useSelector(selectBalanceUpdatedAt);

  return {
    activeTab,
    subscription: {
      subscriptionId,
      currentTierId,
    },
    balance: {
      total: balanceTotal,
      refereePortion: balanceRefereePortion,
      updatedAt: balanceUpdatedAt,
    },
    referralDetails: {
      referralCode,
      refereeCount: referralCount,
      earnedPointsFromReferees: balanceRefereePortion,
    },
  };
};
