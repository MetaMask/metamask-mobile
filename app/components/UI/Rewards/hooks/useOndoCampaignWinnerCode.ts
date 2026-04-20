import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';

export interface UseOndoCampaignWinnerCodeResult {
  /** The winner's claim code for the Ondo campaign, or null if not yet loaded. */
  code: string | null;
  /** Whether the code is currently being fetched. */
  isLoading: boolean;
}

/**
 * Fetches the winning code for the current user in a completed Ondo GM campaign.
 * No caching — always fetches fresh from the controller on mount.
 */
export function useOndoCampaignWinnerCode(
  campaignId: string,
): UseOndoCampaignWinnerCodeResult {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [code, setCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCode = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !campaignId) return;
    try {
      setIsLoading(true);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getOndoCampaignWinnerCode',
        campaignId,
        subscriptionId,
      );
      setCode(result);
    } catch {
      setCode(null);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, subscriptionId]);

  useEffect(() => {
    fetchCode();
  }, [fetchCode]);

  return { code, isLoading };
}
