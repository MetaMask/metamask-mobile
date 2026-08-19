import { CampaignType } from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';
import { useCampaignOutcomeToast } from './useCampaignOutcomeToast';
import { useGetPredictThePitchOutcome } from './useGetPredictThePitchOutcome';

export function useGetPredictThePitchOutcomeToast(): void {
  useCampaignOutcomeToast({
    campaignType: CampaignType.PREDICT_THE_PITCH,
    useOutcome: useGetPredictThePitchOutcome,
    getWinnerNavigation: (campaign) => ({
      route: Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_WINNING_VIEW,
      params: { campaignId: campaign.id, campaignName: campaign.name ?? '' },
    }),
    getNonWinnerNavigation: (campaign) => ({
      route: Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId: campaign.id },
    }),
  });
}

export default useGetPredictThePitchOutcomeToast;
