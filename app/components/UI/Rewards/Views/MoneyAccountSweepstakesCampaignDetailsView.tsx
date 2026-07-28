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
  TextVariant,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import CampaignHowItWorks from '../components/Campaigns/CampaignHowItWorks';
import CampaignStatus from '../components/Campaigns/CampaignStatus';
import MoneyAccountSweepstakesCampaignCTA from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesCampaignCTA';
import MoneyAccountSweepstakesDrawProofModal from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesDrawProofModal';
import MoneyAccountSweepstakesDrawScheduleSection from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesDrawScheduleSection';
import MoneyAccountSweepstakesStatsSummary from '../components/Campaigns/MoneyAccountSweepstakes/MoneyAccountSweepstakesStatsSummary';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useGetMoneyAccountSweepstakesStatsMe } from '../hooks/useGetMoneyAccountSweepstakesStatsMe';
import { useMoneyAccountSweepstakesBinding } from '../hooks/useMoneyAccountSweepstakesBinding';
import { useMoneyAccountSweepstakesParticipation } from '../hooks/useMoneyAccountSweepstakesParticipation';
import { useMoneyAccountSweepstakesSeries } from '../hooks/useMoneyAccountSweepstakesSeries';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import useRewardsToast from '../hooks/useRewardsToast';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';
import { buildMoneyAccountSweepstakesTileCampaign } from '../utils/moneyAccountSweepstakesSeries';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type {
  CampaignHowItWorks as CampaignHowItWorksData,
  MoneyAccountSweepstakesCampaignDetails,
  MoneyAccountSweepstakesDrawProofDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

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

  const { stats, isLoading: isStatsLoading } =
    useGetMoneyAccountSweepstakesStatsMe(displayCampaign?.id);

  const tileCampaign = useMemo(
    () => buildMoneyAccountSweepstakesTileCampaign(series),
    [series],
  );

  const details =
    displayCampaign?.details as MoneyAccountSweepstakesCampaignDetails | null;
  const localizedText = details?.localizedText;

  const hasBalance = (stats?.currentBalanceUsd ?? 0) > 0;
  const showHowItWorksSection =
    Boolean(displayCampaign?.details?.howItWorks) && !hasBalance;
  const showStatsSection = hasBalance;

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

  const navigateToMechanics = useCallback(() => {
    if (!displayCampaign?.id) return;
    navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
      campaignId: displayCampaign.id,
    });
  }, [navigation, displayCampaign?.id]);

  const statusCampaign = tileCampaign ?? displayCampaign;

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
          endButtonIconProps={getCampaignMechanicsButtonProps(
            displayCampaign != null,
            navigateToMechanics,
            'money-account-sweepstakes-details-mechanics-button',
          )}
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

          {statusCampaign && (
            <>
              <CampaignStatus campaign={statusCampaign} optedIn={optedInAny} />

              {showHowItWorksSection &&
                displayCampaign?.details?.howItWorks && (
                  <Box twClassName="p-4">
                    <CampaignHowItWorks
                      howItWorks={
                        displayCampaign.details
                          .howItWorks as CampaignHowItWorksData
                      }
                    />
                  </Box>
                )}

              {showStatsSection && localizedText && (
                <Box twClassName="p-4">
                  <MoneyAccountSweepstakesStatsSummary
                    stats={stats}
                    localizedText={localizedText}
                    isLoading={isStatsLoading}
                  />
                </Box>
              )}

              {campaigns.length > 0 && localizedText && (
                <>
                  <Box twClassName="my-1 border-b border-border-muted" />
                  <Box twClassName="p-4">
                    <MoneyAccountSweepstakesDrawScheduleSection
                      campaigns={campaigns}
                      localizedText={localizedText}
                      activeCampaignId={activeCampaign?.id ?? null}
                      onOpenDrawProof={setSelectedDrawProof}
                    />
                  </Box>
                </>
              )}
            </>
          )}
        </ScrollView>

        {displayCampaign && seriesStatus === 'active' && localizedText && (
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
