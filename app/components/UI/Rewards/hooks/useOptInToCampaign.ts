import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { setCampaignParticipantStatus } from '../../../../reducers/rewards';
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
 */
export const useOptInToCampaign = (): UseOptInToCampaignResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const dispatch = useDispatch();
  const [isOptingIn, setIsOptingIn] = useState(false);
  const [optInError, setOptInError] = useState<string | undefined>(undefined);

  const optInToCampaign = useCallback(
    async (
      campaignId: string,
    ): Promise<CampaignParticipantStatusDto | null> => {
      if (!subscriptionId) {
        return null;
      }

      try {
        setIsOptingIn(true);
        setOptInError(undefined);
        const result = await Engine.controllerMessenger.call(
          'RewardsController:optInToCampaign',
          campaignId,
          subscriptionId,
        );
        dispatch(
          setCampaignParticipantStatus({
            subscriptionId,
            campaignId,
            status: result,
          }),
        );
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Opt-in failed';
        setOptInError(message);
        throw error;
      } finally {
        setIsOptingIn(false);
      }
    },
    [dispatch, subscriptionId],
  );

  const clearOptInError = useCallback(() => setOptInError(undefined), []);

  return { optInToCampaign, isOptingIn, optInError, clearOptInError };
};

export default useOptInToCampaign;
