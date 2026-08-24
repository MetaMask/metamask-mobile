import { CampaignType } from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';
import { useCampaignOutcomeToast } from './useCampaignOutcomeToast';
import { useMoneyAccountSweepstakesOutcome } from './useMoneyAccountSweepstakesOutcome';
import { useMoneyAccountSweepstakesOutcomeToast } from './useMoneyAccountSweepstakesOutcomeToast';

jest.mock('./useCampaignOutcomeToast', () => ({
  useCampaignOutcomeToast: jest.fn(),
}));

jest.mock('./useMoneyAccountSweepstakesOutcome', () => ({
  useMoneyAccountSweepstakesOutcome: jest.fn(),
}));

describe('useMoneyAccountSweepstakesOutcomeToast', () => {
  it('configures useCampaignOutcomeToast for Money Account Sweepstakes', () => {
    useMoneyAccountSweepstakesOutcomeToast();

    expect(useCampaignOutcomeToast).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignType: CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
        useOutcome: useMoneyAccountSweepstakesOutcome,
      }),
    );

    const config = (useCampaignOutcomeToast as jest.Mock).mock.calls[0][0];
    const campaign = {
      id: 'mas-1',
      name: 'Sweepstakes',
      type: CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
    };

    expect(config.getWinnerNavigation(campaign)).toEqual({
      route: Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_WINNING_VIEW,
      params: { campaignId: 'mas-1', campaignName: 'Sweepstakes' },
    });
    expect(config.getNonWinnerNavigation(campaign)).toEqual({
      route: Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId: 'mas-1' },
    });
  });
});
