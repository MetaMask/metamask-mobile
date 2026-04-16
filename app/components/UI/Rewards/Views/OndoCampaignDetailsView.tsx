import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { selectReferralCode } from '../../../../reducers/rewards/selectors';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextButton,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignStatus from '../components/Campaigns/CampaignStatus';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import OndoLeaderboard from '../components/Campaigns/OndoLeaderboard';
import OndoPortfolio from '../components/Campaigns/OndoPortfolio';
import OndoAccountPickerSheet from '../components/Campaigns/OndoAccountPickerSheet';
import OndoCampaignCTA from '../components/Campaigns/OndoCampaignCTA';
import OndoNotEligibleSheet from '../components/Campaigns/OndoNotEligibleSheet';
import CampaignStatsSummary from '../components/Campaigns/CampaignStatsSummary';
import OndoPrizePool from '../components/Campaigns/OndoPrizePool';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';
import { useGetOndoLeaderboardPosition } from '../hooks/useGetOndoLeaderboardPosition';
import { useGetOndoPortfolioPosition } from '../hooks/useGetOndoPortfolioPosition';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { useOndoAccountPicker } from '../hooks/useOndoAccountPicker';
import { useGetOndoCampaignDeposits } from '../hooks/useGetOndoCampaignDeposits';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  CampaignType,
  OndoCampaignHowItWorks,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { getTierMinNetDeposit } from '../components/Campaigns/OndoLeaderboard.utils';
import {
  ONDO_GM_REQUIRED_QUALIFIED_DAYS,
  isCampaignIneligible,
} from '../utils/ondoCampaignConstants';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoCampaignDetailsRouteParams = {
  CampaignDetails: { campaignId?: string };
};

export const CAMPAIGN_DETAILS_TEST_IDS = {
  CONTAINER: 'campaign-details-container',
} as const;

const OndoCampaignDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<RouteProp<OndoCampaignDetailsRouteParams, 'CampaignDetails'>>();
  // campaignId may be absent when arriving via a deeplink (no ID in the URL).
  // In that case we resolve it below by finding the ONDO_HOLDING campaign by type.
  const routeCampaignId = route.params?.campaignId;

  const referralCode = useSelector(selectReferralCode);

  // Fetch campaigns early so the type-based lookup is available before other
  // hooks that need the resolved campaign ID.
  const {
    campaigns,
    isLoading: isCampaignsLoading,
    hasError: hasCampaignsError,
    fetchCampaigns,
  } = useRewardCampaigns();

  const campaign = useMemo(
    () =>
      campaigns.find((c) =>
        routeCampaignId
          ? c.id === routeCampaignId
          : c.type === CampaignType.ONDO_HOLDING,
      ) ?? null,
    [campaigns, routeCampaignId],
  );

  // Resolved ID: use the route param when available, otherwise derive from the
  // type-based lookup above. Falls back to '' while campaigns are still loading
  // so that downstream hooks receive a stable string (they guard against falsy).
  const effectiveCampaignId = routeCampaignId ?? campaign?.id ?? '';

  const { pendingPicker, setPendingPicker, sheetRef, handleGroupSelect } =
    useOndoAccountPicker(effectiveCampaignId || undefined);

  const [portfolioNotEligibleAction, setPortfolioNotEligibleAction] = useState<
    (() => void) | null
  >(null);
  const portfolioNotEligibleActionRef = useRef<(() => void) | null>(null);

  const handlePortfolioNotEligible = useCallback(
    (confirmAction: () => void) => {
      portfolioNotEligibleActionRef.current = confirmAction;
      setPortfolioNotEligibleAction(() => confirmAction);
    },
    [],
  );

  const {
    deposits,
    isLoading: isDepositsLoading,
    hasError: hasDepositsError,
    refetch: refetchDeposits,
  } = useGetOndoCampaignDeposits(effectiveCampaignId || undefined);

  const {
    status: participantStatusData,
    isLoading: isParticipantStatusLoading,
  } = useGetCampaignParticipantStatus(effectiveCampaignId || undefined);

  useTrackRewardsPageView({
    page_type: 'ondo_campaign_detail',
    campaign_id: effectiveCampaignId || undefined,
  });

  useEffect(() => {
    if (campaign && getCampaignStatus(campaign) === 'upcoming') {
      navigation.navigate(Routes.REWARDS_CAMPAIGNS_VIEW);
    }
  }, [campaign, navigation]);

  const isOptedIn = participantStatusData?.optedIn === true;

  // Single fetch point for portfolio — only fetches when opted in
  const {
    portfolio: portfolioData,
    isLoading: isPortfolioLoading,
    hasError: hasPortfolioError,
    refetch: refetchPortfolio,
  } = useGetOndoPortfolioPosition(
    isOptedIn ? effectiveCampaignId || undefined : undefined,
  );

  const hasPositions = Boolean(portfolioData?.positions.length);

  const {
    position: leaderboardPosition,
    isLoading: isLeaderboardPositionLoading,
    hasError: hasLeaderboardPositionError,
    refetch: refetchLeaderboardPosition,
  } = useGetOndoLeaderboardPosition(
    isOptedIn && hasPositions ? effectiveCampaignId || undefined : undefined,
  );

  const {
    leaderboard,
    selectedTier,
    selectedTierData,
    setSelectedTier,
    isLoading: isLeaderboardLoading,
    hasError: hasLeaderboardError,
    isLeaderboardNotYetComputed,
    refetch: refetchLeaderboard,
  } = useGetOndoLeaderboard(effectiveCampaignId || undefined, {
    defaultTier: leaderboardPosition?.projectedTier,
  });

  const tierNames = useMemo(
    () => campaign?.details?.tiers?.map((t) => t.name) ?? [],
    [campaign],
  );

  const leaderboardUserPosition = useMemo(
    () =>
      leaderboardPosition
        ? {
            projectedTier: leaderboardPosition.projectedTier,
            rank: leaderboardPosition.rank,
            neighbors: leaderboardPosition.neighbors ?? [],
          }
        : null,
    [leaderboardPosition],
  );

  const tierMinDeposit = useMemo(
    () =>
      leaderboardPosition &&
      campaign &&
      getCampaignStatus(campaign) === 'active'
        ? getTierMinNetDeposit(
            campaign.details?.tiers,
            leaderboardPosition.projectedTier,
          )
        : null,
    [campaign, leaderboardPosition],
  );

  const notEligibleForCampaign = useMemo(
    () => isCampaignIneligible(campaign, leaderboardPosition?.qualified),
    [campaign, leaderboardPosition],
  );

  const {
    showHowItWorksSection,
    showStatsSummarySection,
    showLeaderboardSection,
    showPortfolioSection,
  } = useMemo(() => {
    if (!campaign) {
      return {
        showHowItWorksSection: false,
        showStatsSummarySection: false,
        showLeaderboardSection: false,
        showPortfolioSection: false,
      };
    }

    return {
      showHowItWorksSection:
        Boolean(campaign.details?.howItWorks) &&
        !hasPositions &&
        getCampaignStatus(campaign) === 'active',
      showStatsSummarySection: hasPositions,
      showPortfolioSection: isOptedIn && hasPositions,
      showLeaderboardSection: true,
    };
  }, [campaign, isOptedIn, hasPositions]);

  return (
    <ErrorBoundary navigation={navigation} view="OndoCampaignDetailsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={CAMPAIGN_DETAILS_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={campaign?.name ?? ''}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'campaign-details-back-button' }}
          endButtonIconProps={
            campaign
              ? [
                  {
                    iconName: IconName.Question,
                    onPress: () =>
                      navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
                        campaignId: effectiveCampaignId,
                      }),
                    testID: 'campaign-details-mechanics-button',
                  },
                ]
              : undefined
          }
          includesTopInset
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {isCampaignsLoading && !campaign && (
            <Box twClassName="px-4 pt-4 gap-4">
              <Skeleton style={tw.style('h-48 rounded-xl')} />
              <Skeleton style={tw.style('h-32 rounded-xl')} />
            </Box>
          )}

          {!isCampaignsLoading && hasCampaignsError && !campaign && (
            <Box twClassName="px-4 pt-4">
              <RewardsErrorBanner
                title={strings('rewards.campaigns_view.error_title')}
                description={strings(
                  'rewards.campaigns_view.error_description',
                )}
                onConfirm={fetchCampaigns}
                confirmButtonLabel={strings(
                  'rewards.campaigns_view.retry_button',
                )}
              />
            </Box>
          )}

          {campaign && (
            <>
              <CampaignStatus campaign={campaign} optedIn={isOptedIn} />

              {/* Phase 1: Not opted in, show how it works section */}
              {showHowItWorksSection && (
                <>
                  <Box twClassName="p-4">
                    <CampaignHowItWorks
                      howItWorks={
                        campaign.details?.howItWorks as OndoCampaignHowItWorks
                      }
                    />
                  </Box>
                </>
              )}

              {showStatsSummarySection && (
                <>
                  <Box twClassName="p-4">
                    <Pressable
                      onPress={() =>
                        navigation.navigate(
                          Routes.REWARDS_ONDO_CAMPAIGN_STATS,
                          { campaignId: effectiveCampaignId },
                        )
                      }
                    >
                      <Box
                        flexDirection={BoxFlexDirection.Row}
                        alignItems={BoxAlignItems.Center}
                        twClassName="gap-2 mb-3"
                      >
                        <Text variant={TextVariant.HeadingMd}>
                          {strings('rewards.ondo_campaign_stats.title')}
                        </Text>
                        <Icon
                          name={IconName.ArrowRight}
                          size={IconSize.Md}
                          color={IconColor.IconAlternative}
                        />
                      </Box>
                    </Pressable>
                    <CampaignStatsSummary
                      leaderboardPosition={leaderboardPosition}
                      portfolioSummary={portfolioData?.summary ?? null}
                      leaderboard={{
                        isLoading: isLeaderboardPositionLoading,
                        hasError: hasLeaderboardPositionError,
                        refetch: refetchLeaderboardPosition,
                      }}
                      portfolio={{
                        isLoading: isPortfolioLoading,
                        hasError: hasPortfolioError,
                        refetch: refetchPortfolio,
                      }}
                      showHeader={false}
                      tierMinDeposit={tierMinDeposit}
                      isIneligible={notEligibleForCampaign}
                    />
                  </Box>
                </>
              )}

              {showPortfolioSection && (
                <>
                  <Box twClassName="p-4">
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      justifyContent={BoxJustifyContent.Between}
                      twClassName="mb-4"
                    >
                      <Text variant={TextVariant.HeadingMd}>
                        {strings(
                          'rewards.ondo_campaign_portfolio.positions_title',
                        )}
                      </Text>
                      <TextButton
                        variant={TextVariant.ButtonLabelMd}
                        onPress={() =>
                          navigation.navigate(
                            Routes.REWARDS_ONDO_CAMPAIGN_PORTFOLIO_VIEW,
                            { campaignId: effectiveCampaignId },
                          )
                        }
                      >
                        {strings(
                          'rewards.ondo_campaign_portfolio.view_activity',
                        )}
                      </TextButton>
                    </Box>
                    <OndoPortfolio
                      portfolio={portfolioData}
                      isLoading={isPortfolioLoading}
                      hasError={hasPortfolioError}
                      refetch={refetchPortfolio}
                      campaignId={effectiveCampaignId}
                      onOpenAccountPicker={setPendingPicker}
                      isCampaignComplete={
                        getCampaignStatus(campaign) === 'complete'
                      }
                      notEligibleForCampaign={notEligibleForCampaign}
                      onNotEligible={handlePortfolioNotEligible}
                    />
                  </Box>
                </>
              )}

              {getCampaignStatus(campaign) === 'active' && (
                <>
                  <Box twClassName="my-1 border-b border-border-muted" />
                  <Box twClassName="p-4">
                    <Text variant={TextVariant.HeadingMd} twClassName="mb-1">
                      {strings('rewards.ondo_campaign_prize_pool.title')}
                    </Text>
                    <OndoPrizePool
                      totalUsdDeposited={deposits?.totalUsdDeposited ?? null}
                      isLoading={isDepositsLoading}
                      hasError={hasDepositsError}
                      refetch={refetchDeposits}
                    />
                  </Box>
                </>
              )}

              {showLeaderboardSection && (
                <>
                  <Box twClassName="my-1 border-b border-border-muted" />
                  <Box twClassName="py-4">
                    <Pressable
                      onPress={() =>
                        navigation.navigate(
                          Routes.REWARDS_ONDO_CAMPAIGN_LEADERBOARD,
                          { campaignId: effectiveCampaignId },
                        )
                      }
                    >
                      <Box
                        flexDirection={BoxFlexDirection.Row}
                        alignItems={BoxAlignItems.Center}
                        twClassName="gap-2 mb-4 px-4"
                      >
                        <Text variant={TextVariant.HeadingMd}>
                          {strings('rewards.ondo_campaign_leaderboard.title')}
                        </Text>
                        <Icon
                          name={IconName.ArrowRight}
                          size={IconSize.Md}
                          color={IconColor.IconAlternative}
                        />
                      </Box>
                    </Pressable>
                    <OndoLeaderboard
                      tierNames={tierNames}
                      selectedTier={selectedTier}
                      onTierChange={setSelectedTier}
                      entries={selectedTierData?.entries ?? []}
                      totalParticipants={
                        selectedTierData?.totalParticipants ?? 0
                      }
                      isLoading={isLeaderboardLoading}
                      hasError={hasLeaderboardError}
                      isLeaderboardNotYetComputed={isLeaderboardNotYetComputed}
                      onRetry={refetchLeaderboard}
                      maxEntries={5}
                      currentUserReferralCode={referralCode}
                      userPosition={leaderboardUserPosition}
                      campaignId={effectiveCampaignId}
                    />
                  </Box>
                </>
              )}
            </>
          )}
        </ScrollView>

        {campaign && (
          <OndoCampaignCTA
            campaign={campaign}
            participantStatus={{
              status: participantStatusData,
              isLoading: isParticipantStatusLoading,
            }}
            hasPositions={hasPositions}
            campaignId={effectiveCampaignId}
            notEligibleForCampaign={notEligibleForCampaign}
          />
        )}

        {pendingPicker && (
          <OndoAccountPickerSheet
            pendingPicker={pendingPicker}
            sheetRef={sheetRef}
            onClose={() => setPendingPicker(null)}
            onGroupSelect={handleGroupSelect}
          />
        )}

        {portfolioNotEligibleAction && (
          <OndoNotEligibleSheet
            onClose={() => {
              setPortfolioNotEligibleAction(null);
              portfolioNotEligibleActionRef.current = null;
            }}
            onConfirm={() => {
              const action = portfolioNotEligibleActionRef.current;
              portfolioNotEligibleActionRef.current = null;
              setPortfolioNotEligibleAction(null);
              action?.();
            }}
          />
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignDetailsView;
