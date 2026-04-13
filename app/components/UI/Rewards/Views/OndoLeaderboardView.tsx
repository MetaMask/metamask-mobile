import React, { useMemo } from 'react';
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
import {
  formatTierDisplayName,
  getTierMinNetDeposit,
} from '../components/Campaigns/OndoLeaderboard.utils';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { strings } from '../../../../../locales/i18n';
import {
  selectReferralCode,
  selectCampaignById,
} from '../../../../reducers/rewards/selectors';

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
  const selectCampaign = useMemo(
    () => selectCampaignById(campaignId),
    [campaignId],
  );
  const campaign = useSelector(selectCampaign);

  const { status: participantStatus } =
    useGetCampaignParticipantStatus(campaignId);
  const isOptedIn = participantStatus?.optedIn === true;

  const { position, isLoading: isPositionLoading } =
    useGetOndoLeaderboardPosition(isOptedIn ? campaignId : undefined);

  const isPending = position != null && !position.qualified;
  const isQualified = position != null && position.qualified;
  const {
    leaderboard: leaderboardData,
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

  const pendingSheetPosition = useMemo(() => {
    if (!position || position.qualified) return null;
    const tierMinDeposit = getTierMinNetDeposit(
      campaign?.details?.tiers,
      position.projectedTier,
    );
    if (tierMinDeposit == null) return null;
    return {
      tier: position.projectedTier,
      netDeposit: position.netDeposit,
      qualifiedDays: position.qualifiedDays,
      tierMinDeposit,
    };
  }, [position, campaign]);

  return (
    <ErrorBoundary navigation={navigation} view="OndoLeaderboardView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.ondo_campaign_leaderboard.title')}
          titleProps={{ variant: TextVariant.HeadingSm }}
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
              pendingSheetPosition={pendingSheetPosition}
            />
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoLeaderboardView;
