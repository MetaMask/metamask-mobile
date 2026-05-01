import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignViewHeader from '../components/Campaigns/CampaignViewHeader';
import OndoLeaderboard from '../components/Campaigns/OndoLeaderboard';
import LeaderboardPositionHeader from '../components/Campaigns/LeaderboardPositionHeader';
import {
  buildLeaderboardUserPosition,
  formatTierDisplayName,
  getCampaignTierNames,
} from '../components/Campaigns/OndoLeaderboard.utils';
import { formatRewardsTimeOnly, formatUsd } from '../utils/formatUtils';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useGetOndoCampaignDeposits } from '../hooks/useGetOndoCampaignDeposits';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useOndoLeaderboardPositionDisplay } from '../hooks/useOndoLeaderboardPositionDisplay';
import { getCurrentPrize } from '../components/Campaigns/OndoPrizePool';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectReferralCode,
  selectCampaignById,
} from '../../../../reducers/rewards/selectors';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoLeaderboardRouteParams = {
  OndoLeaderboard: { campaignId: string };
};

export const ONDO_LEADERBOARD_VIEW_TEST_IDS = {
  CONTAINER: 'ondo-leaderboard-view-container',
  TIER_SELECTOR: 'ondo-leaderboard-view-tier-selector',
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
  const { trackEvent, createEventBuilder } = useAnalytics();

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

  const {
    isCampaignComplete,
    isPending,
    isQualified,
    isIneligible,
    rankValue,
    tierValue,
    returnValue,
    returnColor,
  } = useOndoLeaderboardPositionDisplay({
    campaign,
    position,
    portfolioPnlPercent: portfolioData?.summary?.portfolioPnlPercent,
  });

  const prizePoolValue = deposits?.totalUsdDeposited
    ? formatUsd(
        computePrizePoolProgress(
          BREAKPOINTS,
          parseFloat(deposits.totalUsdDeposited),
          (m) => m.deposit,
        ).currentPrize,
      )
    : undefined;

  const {
    leaderboard: leaderboardData,
    selectedTier,
    selectedTierData,
    setSelectedTier,
    computedAt,
    isLoading: isLeaderboardLoading,
    hasError: hasLeaderboardError,
    isLeaderboardNotYetComputed,
    computedAt: leaderboardComputedAt,
    refetch: refetchLeaderboard,
  } = useGetOndoLeaderboard(campaignId, {
    defaultTier: position?.projectedTier,
  });

  const tierNames = useMemo(() => getCampaignTierNames(campaign), [campaign]);

  const tierOptions = useMemo(
    () =>
      tierNames.map((name) => ({
        key: name,
        value: name,
        label: formatTierDisplayName(name),
      })),
    [tierNames],
  );

  const openTierSelector = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({
          button_type: 'ondo_campaign_leaderboard_tier_select',
        })
        .build(),
    );
    navigation.navigate(Routes.MODAL.REWARDS_SELECT_SHEET, {
      title: strings('rewards.ondo_campaign_leaderboard.select_tier'),
      options: tierOptions,
      selectedValue: selectedTier,
      onSelect: setSelectedTier,
    });
  }, [
    navigation,
    tierOptions,
    selectedTier,
    setSelectedTier,
    trackEvent,
    createEventBuilder,
  ]);

  const leaderboardUserPosition = useMemo(
    () => buildLeaderboardUserPosition(position),
    [position],
  );

  return (
    <ErrorBoundary navigation={navigation} view="OndoLeaderboardView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER}
      >
        <CampaignViewHeader
          title={strings('rewards.ondo_campaign_leaderboard.title')}
          backButtonTestID="ondo-leaderboard-back-button"
          mechanicsButtonTestID="leaderboard-mechanics-button"
          hasCampaign={campaign != null}
          campaignId={campaignId}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {/* User position */}
          {position && (
            <Box twClassName="p-4">
              <LeaderboardPositionHeader
                rank={rankValue}
                tier={tierValue}
                isLoading={isPositionLoading}
                isPending={!isCampaignComplete && isPending}
                isQualified={isQualified}
                isIneligible={!isCampaignComplete && isIneligible}
                showReturn
                returnValue={returnValue}
                returnColor={returnColor}
                showPrizePool
                prizePoolValue={prizePoolValue}
                prizePoolLoading={isDepositsLoading && !deposits}
              />
            </Box>
          )}

          {/* Divider */}
          <Box twClassName="my-1 border-b border-border-muted" />

          {/* Tier selector + last updated row */}
          {selectedTier && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="px-4 py-3"
            >
              <Pressable
                onPress={tierNames.length > 1 ? openTierSelector : undefined}
                testID={ONDO_LEADERBOARD_VIEW_TEST_IDS.TIER_SELECTOR}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="border border-border-default rounded-full px-3 py-1 gap-1"
                >
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                  >
                    {formatTierDisplayName(selectedTier)}
                  </Text>
                  {tierNames.length > 1 && (
                    <Icon
                      name={IconName.ArrowDown}
                      size={IconSize.Xs}
                      color={IconColor.IconDefault}
                    />
                  )}
                </Box>
              </Pressable>
              {computedAt && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('rewards.ondo_campaign_leaderboard.updated_at', {
                    time: formatRewardsTimeOnly(new Date(computedAt)),
                  })}
                </Text>
              )}
            </Box>
          )}

          {/* Full leaderboard */}
          <Box twClassName="pb-4">
            <OndoLeaderboard
              tierNames={tierNames}
              selectedTier={selectedTier}
              onTierChange={setSelectedTier}
              currentUserReferralCode={referralCode}
              entries={selectedTierData?.entries ?? []}
              totalParticipants={selectedTierData?.totalParticipants ?? 0}
              isLoading={isLeaderboardLoading}
              userPosition={leaderboardUserPosition}
              hasError={hasLeaderboardError}
              isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
              onRetry={refetchLeaderboard}
              campaignId={campaignId}
              isCampaignComplete={isCampaignComplete}
              hideTierHeader
            />
          </Box>
      
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoLeaderboardView;
