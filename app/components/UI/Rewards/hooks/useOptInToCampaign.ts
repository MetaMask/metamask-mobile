import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import type { CampaignParticipantStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseOptInToCampaignResult {
  /** Opt the current subscription into a campaign */
  optInToCampaign: (
    campaignId: string,
  ) => Promise<CampaignParticipantStatusDto | null>;
  /** Whether opt-in is in progress */
  isOptingIn: boolean;
  /** Error message if opt-in failed */
  optInError: string | undefined;
  /** Clear the opt-in error */
  clearOptInError: () => void;
}

/**
 * Hook to opt the current subscription into a campaign.
 * Returns null immediately when the campaigns feature flag is disabled.
 */
export const useOptInToCampaign = (): UseOptInToCampaignResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isCampaignsEnabled = useSelector(selectCampaignsRewardsEnabledFlag);
  const [isOptingIn, setIsOptingIn] = useState(false);
  const [optInError, setOptInError] = useState<string | undefined>(undefined);

  const optInToCampaign = useCallback(
    async (
      campaignId: string,
    ): Promise<CampaignParticipantStatusDto | null> => {
      if (!isCampaignsEnabled || !subscriptionId) {
        return null;
      }

      try {
        setIsOptingIn(true);
        setOptInError(undefined);
        return await Engine.controllerMessenger.call(
          'RewardsController:optInToCampaign',
          campaignId,
          subscriptionId,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Opt-in failed';
        setOptInError(message);
        throw error;
      } finally {
        setIsOptingIn(false);
      }
    },
    [subscriptionId, isCampaignsEnabled],
  );

  const clearOptInError = useCallback(() => setOptInError(undefined), []);

  return { optInToCampaign, isOptingIn, optInError, clearOptInError };
};

export default useOptInToCampaign;
