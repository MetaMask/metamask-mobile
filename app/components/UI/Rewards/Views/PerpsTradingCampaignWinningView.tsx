import React, { useMemo } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { usePerpsTradingCampaignParticipantOutcome } from '../hooks/usePerpsTradingCampaignParticipantOutcome';
import { formatOrdinalRank, formatSignedUsd } from '../utils/formatUtils';
import { useGetPerpsTradingCampaignLeaderboardPosition } from '../hooks/useGetPerpsTradingCampaignLeaderboardPosition';
import CampaignWinningView from './CampaignWinningView';
import Routes from '../../../../constants/navigation/Routes';

const PRIZE_EMAIL = 'perpscampaign@consensys.net';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PerpsTradingCampaignWinningRouteParams = {
  RewardsPerpsTradingCampaignWinning: {
    campaignId: string;
    campaignName: string;
  };
};

export const PERPS_TRADING_CAMPAIGN_WINNING_VIEW_TEST_IDS = {
  CONTAINER: 'perps-trading-campaign-winning-view-container',
} as const;

const PerpsTradingCampaignWinningView: React.FC = () => {
  const route =
    useRoute<
      RouteProp<
        PerpsTradingCampaignWinningRouteParams,
        'RewardsPerpsTradingCampaignWinning'
      >
    >();
  const { campaignId, campaignName } = route.params;

  const { outcome, isLoading: isOutcomeLoading } =
    usePerpsTradingCampaignParticipantOutcome(campaignId);
  const winningCode = outcome?.winnerVerificationCode ?? null;

  const { position, isLoading: positionLoading } =
    useGetPerpsTradingCampaignLeaderboardPosition(campaignId);

  const rankDisplay = useMemo(() => {
    if (!outcome?.rank) {
      return null;
    }
    return formatOrdinalRank(outcome.rank);
  }, [outcome]);

  const resultDisplay = useMemo(() => {
    if (!position) return null;
    return formatSignedUsd(position.pnl);
  }, [position]);

  const fallbackRoute = useMemo(
    () => ({
      route: Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId },
    }),
    [campaignId],
  );

  return (
    <CampaignWinningView
      testID={PERPS_TRADING_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER}
      viewName="PerpsTradingCampaignWinningView"
      prizeEmail={PRIZE_EMAIL}
      campaignName={campaignName}
      campaignId={campaignId}
      analyticsPageType="perps_trading_campaign_winning"
      winningCode={winningCode}
      hasOutcomeLoaded={Boolean(outcome)}
      isLoading={isOutcomeLoading}
      rankDisplay={rankDisplay}
      resultDisplay={resultDisplay}
      isRankLoading={isOutcomeLoading}
      isResultLoading={positionLoading}
      fallbackRoute={fallbackRoute}
    />
  );
};

export default PerpsTradingCampaignWinningView;
