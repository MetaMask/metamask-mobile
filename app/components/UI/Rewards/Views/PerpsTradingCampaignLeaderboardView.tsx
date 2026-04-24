import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Box, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import PerpsTradingCampaignLeaderboard from '../components/Campaigns/PerpsTradingCampaignLeaderboard';
import PerpsTradingCampaignStatsHeader from '../components/Campaigns/PerpsTradingCampaignStatsHeader';
import { useGetPerpsTradingCampaignLeaderboard } from '../hooks/useGetPerpsTradingCampaignLeaderboard';
import { useGetPerpsTradingCampaignLeaderboardPosition } from '../hooks/useGetPerpsTradingCampaignLeaderboardPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectReferralCode,
  selectCampaignById,
} from '../../../../reducers/rewards/selectors';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PerpsTradingCampaignLeaderboardRouteParams = {
  RewardsPerpsTradingCampaignLeaderboard: { campaignId: string };
};

export const PERPS_CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS = {
  CONTAINER: 'perps-campaign-leaderboard-view-container',
} as const;

const PerpsTradingCampaignLeaderboardView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<
        PerpsTradingCampaignLeaderboardRouteParams,
        'RewardsPerpsTradingCampaignLeaderboard'
      >
    >();
  const { campaignId } = route.params;
  const referralCode = useSelector(selectReferralCode);

  const selectCampaign = useMemo(
    () => selectCampaignById(campaignId),
    [campaignId],
  );
  const campaign = useSelector(selectCampaign);

  const { status: participantStatus } =
    useGetCampaignParticipantStatus(campaignId);
  const isOptedIn = participantStatus?.optedIn === true;

  const { position, isLoading: isPositionLoading } =
    useGetPerpsTradingCampaignLeaderboardPosition(
      isOptedIn ? campaignId : undefined,
    );

  const {
    leaderboard,
    isLoading: isLeaderboardLoading,
    hasError: hasLeaderboardError,
    isLeaderboardNotYetComputed,
    refetch: refetchLeaderboard,
  } = useGetPerpsTradingCampaignLeaderboard(campaignId);

  const leaderboardUserPosition = useMemo(
    () =>
      position
        ? { rank: position.rank, neighbors: position.neighbors ?? [] }
        : null,
    [position],
  );

  return (
    <ErrorBoundary
      navigation={navigation}
      view="PerpsTradingCampaignLeaderboardView"
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={PERPS_CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.perps_trading_campaign.leaderboard_title')}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'perps-leaderboard-back-button' }}
          endButtonIconProps={getCampaignMechanicsButtonProps(
            campaign != null,
            () =>
              navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
                campaignId,
              }),
            'perps-leaderboard-mechanics-button',
          )}
          includesTopInset
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {/* User position header */}
          {isOptedIn && (
            <>
              <Box twClassName="p-4">
                <PerpsTradingCampaignStatsHeader
                  position={position}
                  isLoading={isPositionLoading}
                />
              </Box>
              <Box twClassName="my-1 border-b border-border-muted" />
            </>
          )}

          {/* Full leaderboard */}
          <Box twClassName="py-4">
            <PerpsTradingCampaignLeaderboard
              entries={leaderboard?.entries ?? []}
              totalParticipants={leaderboard?.totalParticipants ?? 0}
              computedAt={leaderboard?.computedAt ?? null}
              isLoading={isLeaderboardLoading}
              hasError={hasLeaderboardError}
              isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
              onRetry={refetchLeaderboard}
              currentUserReferralCode={referralCode}
              userPosition={leaderboardUserPosition}
              campaignId={campaignId}
            />
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PerpsTradingCampaignLeaderboardView;
