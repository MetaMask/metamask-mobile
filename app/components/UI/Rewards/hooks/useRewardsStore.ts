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
  selectSeasonName,
  selectSeasonTiers,
  selectSeasonEndDate,
  selectSeasonStartDate,
} from '../../../../reducers/rewards/selectors';
import { RewardsTab } from '../../../../reducers/rewards/types';
import { SeasonTierDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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
  season: {
    name: string | null;
    startDate: Date | null;
    endDate: Date | null;
    tiers: SeasonTierDto[];
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
  const seasonStatusLoading = useSelector(selectSeasonStatusLoading);
  const seasonName = useSelector(selectSeasonName);
  const seasonStartDate = useSelector(selectSeasonStartDate);
  const seasonEndDate = useSelector(selectSeasonEndDate);
  const seasonTiers = useSelector(selectSeasonTiers);

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
    season: {
      name: seasonName,
      startDate: seasonStartDate,
      endDate: seasonEndDate,
      tiers: seasonTiers,
    },
  };
};
