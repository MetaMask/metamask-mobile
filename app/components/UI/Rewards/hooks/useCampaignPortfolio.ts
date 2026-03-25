import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignPortfolioById } from '../../../../reducers/rewards/selectors';
import { setCampaignPortfolio } from '../../../../reducers/rewards';
import type { CampaignPortfolioDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseCampaignPortfolioResult {
  /** Portfolio data, or null when not yet loaded */
  portfolio: CampaignPortfolioDto | null;
  /** Whether the portfolio is being fetched */
  isLoading: boolean;
  /** Whether there was an error fetching the portfolio */
  hasError: boolean;
  /** Manually re-fetch the portfolio (also invalidates the cache via controller TTL) */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the campaign portfolio for the current subscription.
 * Results are cached for 5 minutes by the RewardsController.
 */
export const useCampaignPortfolio = (
  campaignId: string | undefined,
): UseCampaignPortfolioResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const portfolio = useSelector(selectCampaignPortfolioById(campaignId));
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fetchPortfolio = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !campaignId) {
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);

      const result = await Engine.controllerMessenger.call(
        'RewardsController:getOndoCampaignPortfolio',
        campaignId,
        subscriptionId,
      );
      dispatch(setCampaignPortfolio({ campaignId, portfolio: result }));
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, subscriptionId, campaignId]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  return { portfolio, isLoading, hasError, refetch: fetchPortfolio };
};

export default useCampaignPortfolio;
