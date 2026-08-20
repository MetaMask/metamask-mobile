import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  Box,
  BoxFlexDirection,
  IconName,
  TextVariant,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import MoneyAccountSweepstakesCampaignCTA from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesCampaignCTA';
import MoneyAccountSweepstakesDrawScheduleSection from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesDrawScheduleSection';
import MoneyAccountSweepstakesCampaignOverview from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesCampaignOverview';
import MoneyAccountSweepstakesLearnMoreRows from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesLearnMoreRows';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useGetMoneyAccountSweepstakesStatsMe } from '../hooks/useGetMoneyAccountSweepstakesStatsMe';
import { useMoneyAccountSweepstakesBinding } from '../hooks/useMoneyAccountSweepstakesBinding';
import { useMoneyAccountSweepstakesParticipation } from '../hooks/useMoneyAccountSweepstakesParticipation';
import { useMoneyAccountSweepstakesSeries } from '../hooks/useMoneyAccountSweepstakesSeries';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import useRewardsToast from '../hooks/useRewardsToast';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { buildMoneyAccountSweepstakesTileCampaign } from '../utils/moneyAccountSweepstakesSeries';
import { navigateToRewardsRoute } from '../utils';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type {
  CampaignDto,
  CampaignHowItWorks as CampaignHowItWorksData,
  MoneyAccountSweepstakesCampaignDetails,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { documentToPlainText } from '../components/ContentfulRichText/ContentfulRichText';

export const MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW_TEST_IDS = {
  CONTAINER: 'money-account-sweepstakes-campaign-details-container',
  LOADING_SKELETON: 'money-account-sweepstakes-campaign-details-loading',
} as const;

const MoneyAccountSweepstakesCampaignDetailsSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box
      testID={
        MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW_TEST_IDS.LOADING_SKELETON
      }
    >
      <Box twClassName="px-4 pb-5 pt-4 gap-4">
        <Skeleton style={tw.style('h-32 rounded-xl')} />
        <Box twClassName="gap-2">
          <Skeleton style={tw.style('h-7 w-56 rounded-md')} />
          <Skeleton style={tw.style('h-4 w-full rounded-md')} />
          <Skeleton style={tw.style('h-4 w-4/5 rounded-md')} />
        </Box>
      </Box>

      <Box twClassName="border-b border-border-muted" />

      <Box twClassName="px-4 pt-4 gap-4">
        <Skeleton style={tw.style('h-6 w-40 rounded-md')} />
        {[0, 1, 2].map((index) => (
          <Box
            key={index}
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-3"
          >
            <Skeleton style={tw.style('h-8 w-8 rounded-full')} />
            <Box twClassName="flex-1 gap-2">
              <Skeleton style={tw.style('h-5 w-44 rounded-md')} />
              <Skeleton style={tw.style('h-4 w-full rounded-md')} />
              <Skeleton style={tw.style('h-4 w-5/6 rounded-md')} />
            </Box>
          </Box>
        ))}
      </Box>

      <Box twClassName="border-b border-border-muted mt-4" />

      <Box twClassName="p-4">
        <Box twClassName="gap-3 rounded-xl border border-border-muted p-4">
          <Skeleton style={tw.style('h-5 w-48 rounded-md')} />
          <Skeleton style={tw.style('h-9 w-32 rounded-md')} />
          <Skeleton style={tw.style('h-4 w-full rounded-md')} />
          <Skeleton style={tw.style('h-4 w-3/4 rounded-md')} />
        </Box>
      </Box>
    </Box>
  );
};

const MoneyAccountSweepstakesCampaignDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const conflictToastShownRef = useRef(false);

  const {
    isLoading: isCampaignsLoading,
    hasError: hasCampaignsError,
    fetchCampaigns,
  } = useRewardCampaigns();

  const series = useMoneyAccountSweepstakesSeries();
  const { displayCampaign, campaigns, seriesStatus } = series;

  const { optedInAny } = useMoneyAccountSweepstakesParticipation(
    Boolean(displayCampaign),
  );
  const { ensureBound } = useMoneyAccountSweepstakesBinding();
  const { showToast, RewardsToastOptions } = useRewardsToast();

  const {
    stats,
    isLoading: isStatsLoading,
    hasError: hasStatsError,
    refetch: refetchStats,
  } = useGetMoneyAccountSweepstakesStatsMe(displayCampaign?.id);

  const tileCampaign = useMemo(
    () => buildMoneyAccountSweepstakesTileCampaign(series),
    [series],
  );

  const details =
    displayCampaign?.details as MoneyAccountSweepstakesCampaignDetails | null;
  const localizedText = details?.localizedText;

  const hasBalance = (stats?.currentBalanceUsd ?? 0) > 0;
  const showHowItWorksSection =
    Boolean(displayCampaign?.details?.howItWorks) && !optedInAny && !hasBalance;

  useTrackRewardsPageView({
    page_type: 'money_account_sweepstakes_campaign_details',
    campaign_id: displayCampaign?.id,
  });

  // Re-assert Money Account binding for already-opted-in users. Late-discovered
  // conflicts must surface — deposits cannot earn entries without a binding.
  useEffect(() => {
    if (!optedInAny || seriesStatus !== 'active' || !localizedText) {
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await ensureBound();
      if (cancelled || result !== 'conflict' || conflictToastShownRef.current) {
        return;
      }
      conflictToastShownRef.current = true;
      showToast(
        RewardsToastOptions.entriesClosed(
          localizedText.bindingConflictTitle,
          localizedText.bindingConflictDescription,
        ),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [
    optedInAny,
    seriesStatus,
    localizedText,
    ensureBound,
    showToast,
    RewardsToastOptions,
  ]);

  const statusCampaign = tileCampaign ?? displayCampaign;

  const navigateToWinnerDetails = useCallback(
    (campaign: CampaignDto) => {
      navigateToRewardsRoute(
        navigation,
        Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_WINNING_VIEW,
        {
          campaignId: campaign.id,
          campaignName: campaign.name,
        },
      );
    },
    [navigation],
  );

  return (
    <ErrorBoundary
      navigation={navigation}
      view="MoneyAccountSweepstakesCampaignDetailsView"
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={
          MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW_TEST_IDS.CONTAINER
        }
      >
        <HeaderCompactStandard
          title={displayCampaign?.name ?? ''}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{
            testID: 'money-account-sweepstakes-details-back-button',
          }}
          includesTopInset
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {isCampaignsLoading && !displayCampaign && (
            <MoneyAccountSweepstakesCampaignDetailsSkeleton />
          )}

          {!isCampaignsLoading && hasCampaignsError && !displayCampaign && (
            <Box twClassName="px-4 pt-4">
              <RewardsErrorBanner
                title={strings('rewards.campaign_details.error_title')}
                description={strings(
                  'rewards.campaign_details.error_description',
                )}
                onConfirm={fetchCampaigns}
                confirmButtonLabel={strings('rewards.campaign_details.retry')}
              />
            </Box>
          )}

          {statusCampaign && localizedText && (
            <>
              <MoneyAccountSweepstakesCampaignOverview
                campaign={statusCampaign}
                localizedText={localizedText}
                isParticipating={optedInAny}
                stats={stats}
                isStatsLoading={isStatsLoading}
                hasStatsError={hasStatsError}
                onRetryStats={refetchStats}
              >
                {optedInAny && (
                  <MoneyAccountSweepstakesCampaignCTA
                    campaign={displayCampaign ?? statusCampaign}
                    seriesStatus={seriesStatus}
                    localizedText={localizedText}
                    inline
                  />
                )}
              </MoneyAccountSweepstakesCampaignOverview>

              {showHowItWorksSection &&
                displayCampaign?.details?.howItWorks && (
                  <>
                    <Box twClassName="border-b border-border-muted" />
                    <Box twClassName="px-4 pt-4">
                      <CampaignHowItWorks
                        howItWorks={
                          displayCampaign.details
                            .howItWorks as CampaignHowItWorksData
                        }
                        showStepNumbers={false}
                        showStepDividers
                        stepIcons={[
                          IconName.Bank,
                          IconName.Calendar,
                          IconName.Trophy,
                        ]}
                        title={
                          documentToPlainText(
                            displayCampaign.details.howItWorks.title,
                          ) || undefined
                        }
                      />
                    </Box>
                    <Box twClassName="border-b border-border-muted" />
                  </>
                )}

              {campaigns.length > 0 && (
                <>
                  <Box twClassName="p-4">
                    <MoneyAccountSweepstakesDrawScheduleSection
                      campaigns={campaigns}
                      localizedText={localizedText}
                      entryCount={stats?.entryCount}
                      isParticipating={optedInAny}
                      onOpenWinnerDetails={navigateToWinnerDetails}
                    />
                  </Box>
                </>
              )}

              {optedInAny && displayCampaign && (
                <MoneyAccountSweepstakesLearnMoreRows
                  campaignId={displayCampaign.id}
                  localizedText={localizedText}
                />
              )}
            </>
          )}
        </ScrollView>

        {displayCampaign &&
          localizedText &&
          !optedInAny &&
          seriesStatus === 'active' && (
            <MoneyAccountSweepstakesCampaignCTA
              campaign={displayCampaign}
              seriesStatus={seriesStatus}
              localizedText={localizedText}
            />
          )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default MoneyAccountSweepstakesCampaignDetailsView;
