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
  selectSeasonStatusLoading,
} from '../../../../reducers/rewards/selectors';
import { RewardsTab } from '../../../../reducers/rewards/types';

export interface UseRewardsStoreResult {
  activeTab: RewardsTab | null;
  subscriptionId: string | null;
  currentTierId: string | null;
  balance: {
    total: number | null;
    refereePortion: number | null;
    updatedAt: Date | null;
  };
  referralDetails: {
    referralCode: string | null;
    refereeCount: number;
  };
  seasonStatusLoading: boolean;
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
  const seasonStatusLoading = useSelector(selectSeasonStatusLoading);
  return {
    activeTab,
    subscriptionId,
    currentTierId,
    balance: {
      total: balanceTotal,
      refereePortion: balanceRefereePortion,
      updatedAt: balanceUpdatedAt,
    },
    referralDetails: {
      referralCode,
      refereeCount: referralCount,
    },
    seasonStatusLoading,
  };
};
