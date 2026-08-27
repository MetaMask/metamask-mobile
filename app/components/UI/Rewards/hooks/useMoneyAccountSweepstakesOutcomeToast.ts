import { CampaignType } from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';
import { useCampaignOutcomeToast } from './useCampaignOutcomeToast';
import { useMoneyAccountSweepstakesOutcome } from './useMoneyAccountSweepstakesOutcome';

export function useMoneyAccountSweepstakesOutcomeToast(): void {
  useCampaignOutcomeToast({
    campaignType: CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
    useOutcome: useMoneyAccountSweepstakesOutcome,
    getWinnerNavigation: (campaign) => ({
      route: Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_WINNING_VIEW,
      params: { campaignId: campaign.id, campaignName: campaign.name ?? '' },
    }),
    getNonWinnerNavigation: (campaign) => ({
      route: Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId: campaign.id },
    }),
  });
}

export default useMoneyAccountSweepstakesOutcomeToast;
