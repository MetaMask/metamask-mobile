import React, { useMemo } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useGetPredictThePitchOutcome } from '../hooks/useGetPredictThePitchOutcome';
import { useGetPredictThePitchLeaderboardPosition } from '../hooks/useGetPredictThePitchLeaderboardPosition';
import { formatOrdinalRank, formatPercentChange } from '../utils/formatUtils';
import CampaignWinningView from './CampaignWinningView';
import Routes from '../../../../constants/navigation/Routes';

const PRIZE_EMAIL = 'predictcampaign@consensys.net';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PredictThePitchCampaignWinningRouteParams = {
  RewardsPredictThePitchCampaignWinning: {
    campaignId: string;
    campaignName: string;
  };
};

export const PREDICT_THE_PITCH_CAMPAIGN_WINNING_VIEW_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-campaign-winning-view-container',
} as const;

const PredictThePitchCampaignWinningView: React.FC = () => {
  const route =
    useRoute<
      RouteProp<
        PredictThePitchCampaignWinningRouteParams,
        'RewardsPredictThePitchCampaignWinning'
      >
    >();
  const { campaignId, campaignName } = route.params;

  const { outcome, isLoading: isOutcomeLoading } =
    useGetPredictThePitchOutcome(campaignId);
  const winningCode = outcome?.winnerVerificationCode ?? null;

  const { position, isLoading: positionLoading } =
    useGetPredictThePitchLeaderboardPosition(campaignId);

  const rankDisplay = useMemo(() => {
    const rank = outcome?.rank ?? position?.rank;
    if (!rank) return null;
    return formatOrdinalRank(rank);
  }, [outcome?.rank, position?.rank]);

  const resultDisplay = useMemo(() => {
    if (!position) return null;
    return formatPercentChange(position.roi);
  }, [position]);

  const fallbackRoute = useMemo(
    () => ({
      route: Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId },
    }),
    [campaignId],
  );

  return (
    <CampaignWinningView
      testID={PREDICT_THE_PITCH_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER}
      viewName="PredictThePitchCampaignWinningView"
      prizeEmail={PRIZE_EMAIL}
      campaignName={campaignName}
      campaignId={campaignId}
      analyticsPageType="predict_the_pitch_campaign_winning"
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

export default PredictThePitchCampaignWinningView;
