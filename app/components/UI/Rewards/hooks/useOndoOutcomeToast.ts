import { CampaignType } from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';
import { useCampaignOutcomeToast } from './useCampaignOutcomeToast';
import { useOndoCampaignParticipantOutcome } from './useOndoCampaignParticipantOutcome';

export function useOndoOutcomeToast(): void {
  useCampaignOutcomeToast({
    campaignType: CampaignType.ONDO_HOLDING,
    useOutcome: useOndoCampaignParticipantOutcome,
    getWinnerNavigation: (campaign) => ({
      route: Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW,
      params: { campaignId: campaign.id, campaignName: campaign.name ?? '' },
    }),
    getNonWinnerNavigation: (campaign) => ({
      route: Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId: campaign.id },
    }),
  });
}

export default useOndoOutcomeToast;
