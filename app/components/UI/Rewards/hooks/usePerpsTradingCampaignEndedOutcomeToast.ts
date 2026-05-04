import { CampaignType } from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';
import { useCampaignOutcomeToast } from './useCampaignOutcomeToast';
import { usePerpsTradingCampaignParticipantOutcome } from './usePerpsTradingCampaignParticipantOutcome';

export function usePerpsTradingCampaignEndedOutcomeToast(): void {
  useCampaignOutcomeToast({
    campaignType: CampaignType.PERPS_TRADING,
    useOutcome: usePerpsTradingCampaignParticipantOutcome,
    getWinnerNavigation: (campaign) => ({
      route: Routes.REWARDS_PERPS_TRADING_CAMPAIGN_WINNING_VIEW,
      params: { campaignId: campaign.id, campaignName: campaign.name ?? '' },
    }),
    getNonWinnerNavigation: () => ({
      route: Routes.REWARDS_CAMPAIGNS_VIEW,
      params: {},
    }),
  });
}

export default usePerpsTradingCampaignEndedOutcomeToast;
