import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../selectors/rewards';
import { selectOndoCampaignBalanceHistoryById } from '../../../../reducers/rewards/selectors';
import { setOndoCampaignBalanceHistory } from '../../../../reducers/rewards';
import type { OndoGmBalanceHistoryDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetOndoBalanceHistoryResult {
  balanceHistory: OndoGmBalanceHistoryDto | null;
  isLoading: boolean;
  hasError: boolean;
  hasFetched: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the current user's Ondo GM portfolio balance history for a campaign.
 * This is an authenticated endpoint.
 * Results are cached for 30 minutes by the RewardsController.
 */
export const useGetOndoBalanceHistory = (
  campaignId: string | undefined,
): UseGetOndoBalanceHistoryResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isOptedIn = useSelector(
    selectCampaignParticipantOptedIn(subscriptionId, campaignId),
  );
  const balanceHistory = useSelector(
    selectOndoCampaignBalanceHistoryById(
      subscriptionId ?? undefined,
      campaignId,
    ),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchBalanceHistory = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !campaignId || !isOptedIn) {
      setIsLoading(false);
      setHasError(false);
      setHasFetched(false);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPortfolioBalanceHistory',
        campaignId,
        subscriptionId,
      );
      dispatch(
        setOndoCampaignBalanceHistory({
          subscriptionId,
          campaignId,
          balanceHistory: result,
        }),
      );
    } catch (e) {
      console.error(
        'useGetOndoBalanceHistory: failed to fetch balance history',
        e,
      );
      setHasError(true);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [dispatch, subscriptionId, campaignId, isOptedIn]);

  useEffect(() => {
    fetchBalanceHistory();
  }, [fetchBalanceHistory]);

  return {
    balanceHistory,
    isLoading,
    hasError,
    hasFetched,
    refetch: fetchBalanceHistory,
  };
};

export default useGetOndoBalanceHistory;
