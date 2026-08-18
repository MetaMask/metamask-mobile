import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  Box,
  IconName,
  TextVariant,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import { CampaignOutcomeBanner } from '../components/Campaigns/CampaignOutcomeBanners';
import MoneyAccountSweepstakesCampaignCTA from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesCampaignCTA';
import MoneyAccountSweepstakesDrawProofModal from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesDrawProofModal';
import MoneyAccountSweepstakesDrawScheduleSection from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesDrawScheduleSection';
import MoneyAccountSweepstakesCampaignOverview from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesCampaignOverview';
import MoneyAccountSweepstakesLearnMoreRows from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesLearnMoreRows';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useGetMoneyAccountSweepstakesStatsMe } from '../hooks/useGetMoneyAccountSweepstakesStatsMe';
import { useMoneyAccountSweepstakesBinding } from '../hooks/useMoneyAccountSweepstakesBinding';
import { useMoneyAccountSweepstakesParticipation } from '../hooks/useMoneyAccountSweepstakesParticipation';
import { useMoneyAccountSweepstakesOutcome } from '../hooks/useMoneyAccountSweepstakesOutcome';
import { useMoneyAccountSweepstakesSeries } from '../hooks/useMoneyAccountSweepstakesSeries';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import useRewardsToast from '../hooks/useRewardsToast';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { buildMoneyAccountSweepstakesTileCampaign } from '../utils/moneyAccountSweepstakesSeries';
import { navigateToRewardsRoute } from '../utils';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type {
  CampaignHowItWorks as CampaignHowItWorksData,
  MoneyAccountSweepstakesCampaignDetails,
  MoneyAccountSweepstakesDrawProofDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { documentToPlainText } from '../components/ContentfulRichText/ContentfulRichText';

export const MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW_TEST_IDS = {
  CONTAINER: 'money-account-sweepstakes-campaign-details-container',
} as const;

const MoneyAccountSweepstakesCampaignDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const conflictToastShownRef = useRef(false);
  const [selectedDrawProof, setSelectedDrawProof] =
    useState<MoneyAccountSweepstakesDrawProofDto | null>(null);

  const {
    isLoading: isCampaignsLoading,
    hasError: hasCampaignsError,
    fetchCampaigns,
  } = useRewardCampaigns();

  const series = useMoneyAccountSweepstakesSeries();
  const { displayCampaign, campaigns, seriesStatus, activeCampaign } = series;

  const { optedInAny } = useMoneyAccountSweepstakesParticipation(
    Boolean(displayCampaign),
  );
  const { ensureBound } = useMoneyAccountSweepstakesBinding();
  const { showToast, RewardsToastOptions } = useRewardsToast();

  const { stats } = useGetMoneyAccountSweepstakesStatsMe(displayCampaign?.id);
  const { outcome } = useMoneyAccountSweepstakesOutcome(
    seriesStatus === 'previous' ? displayCampaign?.id : undefined,
  );

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

  const navigateToWinnerDetails = useCallback(() => {
    if (!displayCampaign?.id) return;
    navigateToRewardsRoute(
      navigation,
      Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_WINNING_VIEW,
      {
        campaignId: displayCampaign.id,
        campaignName: displayCampaign.name,
      },
    );
  }, [displayCampaign?.id, displayCampaign?.name, navigation]);

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
            <Box twClassName="px-4 pt-4 gap-4">
              <Skeleton style={tw.style('h-48 rounded-xl')} />
              <Skeleton style={tw.style('h-32 rounded-xl')} />
            </Box>
          )}

          {!isCampaignsLoading && hasCampaignsError && !displayCampaign && (
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

          {statusCampaign && localizedText && (
            <>
              <MoneyAccountSweepstakesCampaignOverview
                campaign={statusCampaign}
                localizedText={localizedText}
                isParticipating={optedInAny}
                stats={stats}
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

              {seriesStatus === 'previous' && outcome && (
                <Box twClassName="px-4 pt-4">
                  <CampaignOutcomeBanner
                    outcomeStatus={outcome.outcomeStatus}
                    winnerVerificationCode={outcome.winnerVerificationCode}
                    onWinnerPress={navigateToWinnerDetails}
                  />
                </Box>
              )}

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
                      minimumWeekCount={4}
                      anchorToCurrentWeek
                      entryCount={stats?.entryCount}
                      isParticipating={optedInAny}
                      activeCampaignId={activeCampaign?.id ?? null}
                      onOpenDrawProof={setSelectedDrawProof}
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
          (seriesStatus === 'active' || seriesStatus === 'upcoming') && (
            <MoneyAccountSweepstakesCampaignCTA
              campaign={displayCampaign}
              seriesStatus={seriesStatus}
              localizedText={localizedText}
            />
          )}

        {selectedDrawProof && localizedText && (
          <MoneyAccountSweepstakesDrawProofModal
            drawProof={selectedDrawProof}
            localizedText={localizedText}
            onClose={() => setSelectedDrawProof(null)}
          />
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default MoneyAccountSweepstakesCampaignDetailsView;
