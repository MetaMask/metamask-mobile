import React, { useMemo } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useMoneyAccountSweepstakesOutcome } from '../hooks/useMoneyAccountSweepstakesOutcome';
import { formatUsd } from '../utils/formatUtils';
import CampaignWinningView from './CampaignWinningView';
import Routes from '../../../../constants/navigation/Routes';

const PRIZE_EMAIL = 'moneyaccountcampaign@consensys.net';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type MoneyAccountSweepstakesCampaignWinningRouteParams = {
  RewardsMoneyAccountSweepstakesCampaignWinning: {
    campaignId: string;
    campaignName: string;
  };
};

export const MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_WINNING_VIEW_TEST_IDS = {
  CONTAINER: 'money-account-sweepstakes-campaign-winning-view-container',
} as const;

const MoneyAccountSweepstakesCampaignWinningView: React.FC = () => {
  const route =
    useRoute<
      RouteProp<
        MoneyAccountSweepstakesCampaignWinningRouteParams,
        'RewardsMoneyAccountSweepstakesCampaignWinning'
      >
    >();
  const { campaignId, campaignName } = route.params;

  const { outcome, isLoading: isOutcomeLoading } =
    useMoneyAccountSweepstakesOutcome(campaignId);
  const winningCode = outcome?.winnerVerificationCode ?? null;

  const rankDisplay = useMemo(() => {
    if (outcome?.prizeAmountUsd == null) {
      return null;
    }
    return formatUsd(outcome.prizeAmountUsd);
  }, [outcome?.prizeAmountUsd]);

  const fallbackRoute = useMemo(
    () => ({
      route: Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId },
    }),
    [campaignId],
  );

  return (
    <CampaignWinningView
      testID={
        MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER
      }
      viewName="MoneyAccountSweepstakesCampaignWinningView"
      prizeEmail={PRIZE_EMAIL}
      campaignName={campaignName}
      campaignId={campaignId}
      analyticsPageType="money_account_sweepstakes_campaign_winning"
      winningCode={winningCode}
      hasOutcomeLoaded={Boolean(outcome)}
      isLoading={isOutcomeLoading}
      rankDisplay={rankDisplay}
      isRankLoading={isOutcomeLoading}
      fallbackRoute={fallbackRoute}
    />
  );
};

export default MoneyAccountSweepstakesCampaignWinningView;
