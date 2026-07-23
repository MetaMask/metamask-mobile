import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  Box,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import PredictThePitchLeaderboard, {
  PREDICT_THE_PITCH_LEADERBOARD_TEST_IDS,
} from '../components/Campaigns/PredictThePitchLeaderboard';
import PredictThePitchStatsHeader from '../components/Campaigns/PredictThePitchStatsHeader';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetPredictThePitchLeaderboard } from '../hooks/useGetPredictThePitchLeaderboard';
import { useGetPredictThePitchLeaderboardPosition } from '../hooks/useGetPredictThePitchLeaderboardPosition';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectCampaignById,
  selectReferralCode,
} from '../../../../reducers/rewards/selectors';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PredictThePitchCampaignLeaderboardRouteParams = {
  RewardsPredictThePitchCampaignLeaderboard: { campaignId: string };
};

export const PREDICT_THE_PITCH_CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-campaign-leaderboard-view-container',
} as const;

const PredictThePitchCampaignLeaderboardView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<
        PredictThePitchCampaignLeaderboardRouteParams,
        'RewardsPredictThePitchCampaignLeaderboard'
      >
    >();
  const { campaignId } = route.params;
  const referralCode = useSelector(selectReferralCode);
  const selectCampaign = useMemo(
    () => selectCampaignById(campaignId),
    [campaignId],
  );
  const campaign = useSelector(selectCampaign);

  useTrackRewardsPageView({
    page_type: 'predict_the_pitch_campaign_leaderboard',
    campaign_id: campaignId,
  });

  const { status: participantStatus } =
    useGetCampaignParticipantStatus(campaignId);
  const isOptedIn = participantStatus?.optedIn === true;

  const { position, isLoading: isPositionLoading } =
    useGetPredictThePitchLeaderboardPosition(
      isOptedIn ? campaignId : undefined,
    );

  const hasPosition =
    position != null && Number.isFinite(position.volume) && position.volume > 0;

  const {
    leaderboard,
    isLoading: isLeaderboardLoading,
    hasError: hasLeaderboardError,
    isLeaderboardNotYetComputed,
    refetch: refetchLeaderboard,
  } = useGetPredictThePitchLeaderboard(campaignId);

  const leaderboardUserPosition = useMemo(
    () =>
      position?.rank
        ? { rank: position.rank, neighbors: position.neighbors ?? [] }
        : null,
    [position],
  );

  const isCampaignComplete =
    campaign != null && getCampaignStatus(campaign) === 'complete';

  return (
    <ErrorBoundary
      navigation={navigation}
      view="PredictThePitchCampaignLeaderboardView"
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={PREDICT_THE_PITCH_CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderStandard
          title={strings(
            'rewards.predict_the_pitch_campaign.leaderboard_title',
          )}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{
            testID: 'predict-the-pitch-leaderboard-back-button',
          }}
          endButtonIconProps={getCampaignMechanicsButtonProps(
            campaign != null,
            () =>
              navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
                campaignId,
              }),
            'predict-the-pitch-leaderboard-mechanics-button',
          )}
          includesTopInset
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {isOptedIn && hasPosition && (
            <>
              <Box twClassName="p-4">
                <PredictThePitchStatsHeader
                  position={position}
                  isLoading={isPositionLoading}
                  isCampaignComplete={isCampaignComplete}
                />
              </Box>
              <Box twClassName="my-1 border-b border-border-muted" />
            </>
          )}

          <Box twClassName="py-4">
            <PredictThePitchLeaderboard
              entries={leaderboard?.entries ?? []}
              isLoading={isLeaderboardLoading}
              hasError={hasLeaderboardError}
              isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
              onRetry={refetchLeaderboard}
              currentUserReferralCode={referralCode}
              userPosition={leaderboardUserPosition}
              isCampaignComplete={isCampaignComplete}
              isCurrentUserEligible={position?.eligible}
            />
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PredictThePitchCampaignLeaderboardView;
