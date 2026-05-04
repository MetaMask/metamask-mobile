import React, { useMemo } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useOndoCampaignParticipantOutcome } from '../hooks/useOndoCampaignParticipantOutcome';
import { strings } from '../../../../../locales/i18n';
import { formatOrdinalRank, formatPercentChange } from '../utils/formatUtils';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import CampaignWinningView from './CampaignWinningView';

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
  const tw = useTailwind();
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
    if (!position) return null;
    return strings('rewards.campaign_winning.rank_label', {
      place: formatOrdinalRank(position.rank),
    });
  }, [position]);

  const rateDisplay = useMemo(() => {
    if (!position) return null;
    return formatPercentChange(position.rateOfReturn);
  }, [position]);

  const renderRankSection = () => {
    if (!positionLoading && !position) return null;
    return (
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="items-center gap-1 w-full px-4"
      >
        {rankDisplay !== null ? (
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.SuccessDefault}
            twClassName="text-center"
          >
            {rankDisplay}
          </Text>
        ) : (
          <Skeleton style={tw.style('h-8 w-36 rounded-lg')} />
        )}

        {rateDisplay !== null ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.SuccessDefault}
            twClassName="text-center"
          >
            {rateDisplay}
          </Text>
        ) : (
          <Skeleton style={tw.style('h-6 w-28 rounded-lg')} />
        )}
      </Box>
    );
  };

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
      renderRankSection={renderRankSection}
    />
  );
};

export default OndoCampaignWinningView;
