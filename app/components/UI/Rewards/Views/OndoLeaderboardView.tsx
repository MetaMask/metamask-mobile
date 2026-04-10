import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import OndoLeaderboard from '../components/Campaigns/OndoLeaderboard';
import {
  StatCell,
  PendingTag,
  QualifiedTag,
} from '../components/Campaigns/CampaignStatsSummary';
import { formatTierDisplayName } from '../components/Campaigns/OndoLeaderboard.utils';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { strings } from '../../../../../locales/i18n';
import { selectReferralCode } from '../../../../reducers/rewards/selectors';

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
  const referralCode = useSelector(selectReferralCode);

  const { position, isLoading: isPositionLoading } =
    useGetOndoLeaderboardPosition(campaignId);

  const isPending = position != null && !position.qualified;
  const isQualified = position != null && position.qualified;

  const {
    tierNames,
    selectedTier,
    selectedTierData,
    setSelectedTier,
    isLoading: isLeaderboardLoading,
    hasError: hasLeaderboardError,
    isLeaderboardNotYetComputed,
    refetch: refetchLeaderboard,
  } = useGetOndoLeaderboard(campaignId, {
    defaultTier: position?.projectedTier,
  });

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
          {/* User position */}
          {position && (
            <Box twClassName="p-4 gap-3">
              <Box flexDirection={BoxFlexDirection.Row}>
                <StatCell
                  label="Rank"
                  value={`${position.rank}`}
                  isLoading={isPositionLoading}
                  suffix={isPending ? <PendingTag /> : undefined}
                />
                <StatCell
                  label="Tier"
                  value={formatTierDisplayName(position.projectedTier)}
                  isLoading={isPositionLoading}
                  suffix={
                    isPending ? (
                      <PendingTag />
                    ) : isQualified ? (
                      <QualifiedTag />
                    ) : undefined
                  }
                />
              </Box>
            </Box>
          )}

          {/* Full leaderboard */}
          <Box>
            <OndoLeaderboard
              tierNames={tierNames}
              selectedTier={selectedTier}
              onTierChange={setSelectedTier}
              entries={selectedTierData?.entries ?? []}
              totalParticipants={selectedTierData?.totalParticipants ?? 0}
              isLoading={isLeaderboardLoading}
              hasError={hasLeaderboardError}
              isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
              onRetry={refetchLeaderboard}
              currentUserReferralCode={referralCode}
            />
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoLeaderboardView;
