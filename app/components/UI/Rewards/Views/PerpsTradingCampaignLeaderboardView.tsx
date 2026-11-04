import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignViewHeader from '../components/Campaigns/CampaignViewHeader';
import PerpsTradingCampaignLeaderboard from '../components/Campaigns/PerpsTradingCampaignLeaderboard';
import PerpsTradingCampaignStatsHeader from '../components/Campaigns/PerpsTradingCampaignStatsHeader';
import { useGetPerpsTradingCampaignLeaderboard } from '../hooks/useGetPerpsTradingCampaignLeaderboard';
import { useGetPerpsTradingCampaignLeaderboardPosition } from '../hooks/useGetPerpsTradingCampaignLeaderboardPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { strings } from '../../../../../locales/i18n';
import {
  selectReferralCode,
  selectCampaignById,
} from '../../../../reducers/rewards/selectors';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PerpsTradingCampaignLeaderboardRouteParams = {
  RewardsPerpsTradingCampaignLeaderboard: { campaignId: string };
};

export const PERPS_CAMPAIGN_LEADERBOARD_VIEW_TEST_IDS = {
  CONTAINER: 'perps-campaign-leaderboard-view-container',
} as const;

const PerpsTradingCampaignLeaderboardView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<
        PerpsTradingCampaignLeaderboardRouteParams,
        'RewardsPerpsTradingCampaignLeaderboard'
      >
    >();
  const { campaignId } = route.params;
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
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
      position?.rank
        ? { rank: position.rank, neighbors: position.neighbors ?? [] }
        : null,
    [position],
  );
  const hasPosition =
    position != null && Number.isFinite(position.volume) && position.volume > 0;
  const isCampaignComplete =
    campaign != null && getCampaignStatus(campaign) === 'complete';

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
        <CampaignViewHeader
          title={strings('rewards.perps_trading_campaign.leaderboard_title')}
          backButtonTestID="perps-leaderboard-back-button"
          mechanicsButtonTestID="perps-leaderboard-mechanics-button"
          hasCampaign={campaign != null}
          campaignId={campaignId}
          isGlass={isGlassHeader}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {/* User position header */}
          {isOptedIn && hasPosition && (
            <>
              <Box twClassName="p-4">
                <PerpsTradingCampaignStatsHeader
                  position={position}
                  isLoading={isPositionLoading}
                  isCampaignComplete={isCampaignComplete}
                />
              </Box>
              <Box twClassName="my-1 border-b border-border-muted" />
            </>
          )}

          {/* Full leaderboard */}
          <Box twClassName="py-4">
            <PerpsTradingCampaignLeaderboard
              entries={leaderboard?.entries ?? []}
              isLoading={isLeaderboardLoading}
              hasError={hasLeaderboardError}
              isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
              onRetry={refetchLeaderboard}
              currentUserReferralCode={referralCode}
              userPosition={leaderboardUserPosition}
              campaignId={campaignId}
              isCampaignComplete={isCampaignComplete}
              numberOfWinners={leaderboard?.numberOfWinners}
            />
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PerpsTradingCampaignLeaderboardView;
