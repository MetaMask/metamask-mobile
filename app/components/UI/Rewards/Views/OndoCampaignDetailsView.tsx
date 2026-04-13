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
import { OndoCampaignHowItWorks } from '../../../../core/Engine/controllers/rewards-controller/types';
import { ONDO_GM_REQUIRED_QUALIFIED_DAYS } from '../utils/ondoCampaignConstants';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoCampaignDetailsRouteParams = {
  CampaignDetails: { campaignId: string };
};

export const CAMPAIGN_DETAILS_TEST_IDS = {
  CONTAINER: 'campaign-details-container',
} as const;

const OndoCampaignDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<OndoCampaignDetailsRouteParams, 'CampaignDetails'>>();
  const { campaignId } = route.params;

  const referralCode = useSelector(selectReferralCode);
  const { pendingPicker, setPendingPicker, sheetRef, handleGroupSelect } =
    useOndoAccountPicker(campaignId);

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
  } = useGetOndoCampaignDeposits(campaignId);

  const {
    campaigns,
    isLoading: isCampaignsLoading,
    hasError: hasCampaignsError,
    fetchCampaigns,
  } = useRewardCampaigns();

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  );

  const {
    status: participantStatusData,
    isLoading: isParticipantStatusLoading,
  } = useGetCampaignParticipantStatus(campaignId);

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
  } = useGetOndoPortfolioPosition(isOptedIn ? campaignId : undefined);

  const hasPositions = Boolean(portfolioData?.positions.length);

  const {
    position: leaderboardPosition,
    isLoading: isLeaderboardPositionLoading,
    hasError: hasLeaderboardPositionError,
    refetch: refetchLeaderboardPosition,
  } = useGetOndoLeaderboardPosition(
    isOptedIn && hasPositions ? campaignId : undefined,
  );

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
    defaultTier: leaderboardPosition?.projectedTier,
  });

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
        ? (leaderboardData?.tiers[leaderboardPosition.projectedTier]
            ?.minDeposit ?? null)
        : null,
    [leaderboardData, leaderboardPosition, campaign],
  );

  const leaderboardPendingSheetPosition = useMemo(
    () =>
      leaderboardPosition &&
      !leaderboardPosition.qualified &&
      tierMinDeposit != null
        ? {
            tier: leaderboardPosition.projectedTier,
            netDeposit: leaderboardPosition.netDeposit,
            qualifiedDays: leaderboardPosition.qualifiedDays,
            tierMinDeposit,
          }
        : null,
    [leaderboardPosition, tierMinDeposit],
  );

  const notEligibleForCampaign = useMemo((): boolean => {
    if (!campaign) return false;
    if (isOptedIn && leaderboardPosition?.qualified) return false;
    if (getCampaignStatus(campaign) !== 'active') return false;
    // Backend counts calendar days (UTC): the day a position is opened counts as day 1,
    // and every subsequent calendar day until endDate inclusive counts too.
    // daysAvailable = floor((endDate - startOfTodayUTC) / 24h) + 1
    const now = new Date();
    const startOfTodayUTC = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const endDate = new Date(campaign.endDate).getTime();
    const daysAvailable =
      Math.floor((endDate - startOfTodayUTC) / (1000 * 60 * 60 * 24)) + 1;
    return daysAvailable < ONDO_GM_REQUIRED_QUALIFIED_DAYS;
  }, [campaign, isOptedIn, leaderboardPosition]);

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
      showPortfolioSection: isOptedIn,
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
                        campaignId,
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
                          { campaignId },
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
                      onQualifyPress={
                        leaderboardPendingSheetPosition
                          ? () =>
                              navigation.navigate(
                                Routes.MODAL.REWARDS_ONDO_PENDING_SHEET,
                                {
                                  variant: 'own',
                                  ...leaderboardPendingSheetPosition,
                                },
                              )
                          : undefined
                      }
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
                            { campaignId },
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
                      campaignId={campaignId}
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

              {(getCampaignStatus(campaign) === 'active' ||
                showLeaderboardSection) && (
                <Box twClassName="my-1 border-b border-border-muted" />
              )}

              {getCampaignStatus(campaign) === 'active' && (
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
              )}

              {showLeaderboardSection && (
                <>
                  <Box twClassName="py-4">
                    <Pressable
                      onPress={() =>
                        navigation.navigate(
                          Routes.REWARDS_ONDO_CAMPAIGN_LEADERBOARD,
                          { campaignId },
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
                      pendingSheetPosition={leaderboardPendingSheetPosition}
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
            campaignId={campaignId}
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
