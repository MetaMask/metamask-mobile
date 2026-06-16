import React, { useMemo } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useOndoCampaignParticipantOutcome } from '../hooks/useOndoCampaignParticipantOutcome';
import { formatOrdinalRank, formatPercentChange } from '../utils/formatUtils';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import CampaignWinningView from './CampaignWinningView';
import Routes from '../../../../constants/navigation/Routes';

const PRIZE_EMAIL = 'ondocampaign@consensys.net';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoCampaignWinningRouteParams = {
  RewardsOndoCampaignWinning: { campaignId: string; campaignName?: string };
};

export const ONDO_CAMPAIGN_WINNING_VIEW_TEST_IDS = {
  CONTAINER: 'ondo-campaign-winning-view-container',
} as const;

const OndoCampaignWinningView: React.FC = () => {
  const route =
    useRoute<
      RouteProp<OndoCampaignWinningRouteParams, 'RewardsOndoCampaignWinning'>
    >();
  const { campaignId, campaignName = '' } = route.params;

  const { position, isLoading: positionLoading } =
    useGetOndoLeaderboardPosition(campaignId);

  const { outcome, isLoading: isOutcomeLoading } =
    useOndoCampaignParticipantOutcome(campaignId);
  const winningCode = outcome?.winnerVerificationCode ?? null;

  const rankDisplay = useMemo(() => {
    if (!outcome?.tierRank) return null;
    return formatOrdinalRank(outcome.tierRank);
  }, [outcome]);

  const resultDisplay = useMemo(() => {
    if (!position) return null;
    return formatPercentChange(position.rateOfReturn);
  }, [position]);

  const fallbackRoute = useMemo(
    () => ({
      route: Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId },
    }),
    [campaignId],
  );

  return (
    <CampaignWinningView
      testID={ONDO_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER}
      viewName="OndoCampaignWinningView"
      prizeEmail={PRIZE_EMAIL}
      campaignName={campaignName}
      campaignId={campaignId}
      analyticsPageType="ondo_campaign_winning"
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

export default OndoCampaignWinningView;
