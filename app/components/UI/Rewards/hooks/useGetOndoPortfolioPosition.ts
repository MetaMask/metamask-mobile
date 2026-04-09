import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../selectors/rewards';
import { selectOndoCampaignPortfolioById } from '../../../../reducers/rewards/selectors';
import { setOndoCampaignPortfolioPosition } from '../../../../reducers/rewards';
import type { OndoGmPortfolioDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

export interface UseGetOndoPortfolioPositionResult {
  /** User's portfolio, or null when not found/not yet loaded */
  portfolio: OndoGmPortfolioDto | null;
  /** Whether the portfolio is being fetched */
  isLoading: boolean;
  /** Whether there was an error fetching the portfolio */
  hasError: boolean;
  /** Whether at least one fetch attempt has completed (success or error) */
  hasFetched: boolean;
  /** Manually re-fetch the portfolio */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the current user's Ondo GM portfolio for a campaign.
 * This is an authenticated endpoint.
 * Results are cached for 5 minutes by the RewardsController.
 */
export const useGetOndoPortfolioPosition = (
  campaignId: string | undefined,
): UseGetOndoPortfolioPositionResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isOptedIn = useSelector(
    selectCampaignParticipantOptedIn(subscriptionId, campaignId),
  );
  const portfolio = useSelector(
    selectOndoCampaignPortfolioById(subscriptionId ?? undefined, campaignId),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchPortfolio = useCallback(async (): Promise<void> => {
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
        'RewardsController:getOndoCampaignPortfolioPosition',
        campaignId,
        subscriptionId,
      );
      dispatch(
        setOndoCampaignPortfolioPosition({
          subscriptionId,
          campaignId,
          portfolio: result,
        }),
      );
    } catch (e) {
      console.error(
        'useGetOndoPortfolioPosition: failed to fetch portfolio',
        e,
      );
      setHasError(true);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [dispatch, subscriptionId, campaignId, isOptedIn]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const invalidationEvents = useMemo(
    () => ['RewardsController:portfolioPositionInvalidated'] as const,
    [],
  );
  useInvalidateByRewardEvents(invalidationEvents, fetchPortfolio);

  return {
    portfolio,
    isLoading,
    hasError,
    hasFetched,
    refetch: fetchPortfolio,
  };
};

export default useGetOndoPortfolioPosition;
