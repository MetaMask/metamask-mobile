import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import OndoLeaderboard from '../components/Campaigns/OndoLeaderboard';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { strings } from '../../../../../locales/i18n';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoLeaderboardRouteParams = {
  OndoLeaderboard: { campaignId: string };
};

export const ONDO_LEADERBOARD_VIEW_TEST_IDS = {
  CONTAINER: 'ondo-leaderboard-view-container',
} as const;

const OndoLeaderboardView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<OndoLeaderboardRouteParams, 'OndoLeaderboard'>>();
  const { campaignId } = route.params;

  const {
    tierNames,
    selectedTier,
    selectedTierData,
    computedAt,
    setSelectedTier,
    isLoading: isLeaderboardLoading,
    hasError: hasLeaderboardError,
    isLeaderboardNotYetComputed,
    refetch: refetchLeaderboard,
  } = useGetOndoLeaderboard(campaignId);

  const {
    position,
    isLoading: isPositionLoading,
    hasError: hasPositionError,
    hasFetched: positionHasFetched,
    refetch: refetchPosition,
  } = useGetOndoLeaderboardPosition(campaignId);

  return (
    <ErrorBoundary navigation={navigation} view="OndoLeaderboardView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.ondo_campaign_leaderboard.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'ondo-leaderboard-back-button' }}
          includesTopInset
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {/* Full leaderboard */}

          <Box twClassName="px-4 py-4">
            <OndoLeaderboard
              tierNames={tierNames}
              selectedTier={selectedTier}
              onTierChange={setSelectedTier}
              entries={selectedTierData?.entries ?? []}
              totalParticipants={selectedTierData?.totalParticipants ?? 0}
              computedAt={computedAt}
              isLoading={isLeaderboardLoading}
              hasError={hasLeaderboardError}
              isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
              onRetry={refetchLeaderboard}
              showTitle={false}
            />
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoLeaderboardView;
