import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import OndoLeaderboard from '../components/Campaigns/OndoLeaderboard';
import LeaderboardPositionHeader from '../components/Campaigns/LeaderboardPositionHeader';
import { formatTierDisplayName } from '../components/Campaigns/OndoLeaderboard.utils';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useGetOndoCampaignDeposits } from '../hooks/useGetOndoCampaignDeposits';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { getCurrentPrize } from '../components/Campaigns/OndoPrizePool';
import { formatPercentChange, formatUsd } from '../utils/formatUtils';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectReferralCode,
  selectCampaignById,
} from '../../../../reducers/rewards/selectors';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';

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

  useTrackRewardsPageView({
    page_type: 'ondo_campaign_leaderboard',
    campaign_id: campaignId,
  });

  const { status: participantStatus } =
    useGetCampaignParticipantStatus(campaignId);
  const isOptedIn = participantStatus?.optedIn === true;

  const { position, isLoading: isPositionLoading } =
    useGetOndoLeaderboardPosition(isOptedIn ? campaignId : undefined);

  const { portfolio: portfolioData, isLoading: isPortfolioLoading } =
    useGetOndoPortfolioPosition(isOptedIn ? campaignId : undefined);

  const { deposits, isLoading: isDepositsLoading } =
    useGetOndoCampaignDeposits(campaignId);

  const isPending = position != null && !position.qualified;
  const isQualified = position != null && position.qualified;

  const returnValue = portfolioData?.summary
    ? formatPercentChange(portfolioData.summary.portfolioPnlPercent)
    : undefined;

  const returnColor = portfolioData?.summary
    ? parseFloat(portfolioData.summary.portfolioPnlPercent) < 0
      ? TextColor.ErrorDefault
      : TextColor.SuccessDefault
    : TextColor.TextDefault;

  const prizePoolValue = deposits?.totalUsdDeposited
    ? formatUsd(getCurrentPrize(parseFloat(deposits.totalUsdDeposited)))
    : undefined;

  const {
    leaderboard: leaderboardData,
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

  const tierNames = useMemo(
    () => campaign?.details?.tiers?.map((t) => t.name) ?? [],
    [campaign],
  );

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
          endButtonIconProps={getCampaignMechanicsButtonProps(
            campaign != null,
            () =>
              navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
                campaignId,
              }),
            'leaderboard-mechanics-button',
          )}
          includesTopInset
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {/* User position */}
          {position && (
            <Box twClassName="p-4">
              <LeaderboardPositionHeader
                rank={String(position.rank).padStart(2, '0')}
                tier={formatTierDisplayName(position.projectedTier)}
                isLoading={isPositionLoading}
                isPending={isPending}
                isQualified={isQualified}
                showReturn
                returnValue={returnValue}
                returnColor={returnColor}
                showPrizePool
                prizePoolValue={prizePoolValue}
                prizePoolLoading={isDepositsLoading && !deposits}
              />
            </Box>
          )}
          {/* ── Divider ── */}
          <Box twClassName="my-1 border-b border-border-muted" />
          {/* Full leaderboard */}
          <Box twClassName="py-4">
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
              campaignId={campaignId}
            />
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoLeaderboardView;
