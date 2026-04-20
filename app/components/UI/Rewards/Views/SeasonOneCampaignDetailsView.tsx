import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Box, Skeleton } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import PreviousSeasonSummary from '../components/PreviousSeason/PreviousSeasonSummary';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import { CampaignType } from '../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../locales/i18n';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type SeasonOneCampaignDetailsRouteParams = {
  SeasonOneCampaignDetails: { campaignId?: string };
};

const SeasonOneCampaignDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<SeasonOneCampaignDetailsRouteParams, 'SeasonOneCampaignDetails'>
    >();
  // campaignId may be absent when arriving via a deeplink (no ID in the URL).
  // In that case we fall back to finding the campaign by type.
  const campaignId = route.params?.campaignId;

  const { campaigns, isLoading, hasError, hasLoaded, fetchCampaigns } =
    useRewardCampaigns();

  const campaign = useMemo(
    () =>
      campaigns.find((c) =>
        campaignId ? c.id === campaignId : c.type === CampaignType.SEASON_1,
      ) ?? null,
    [campaigns, campaignId],
  );

  useTrackRewardsPageView({
    page_type: 'campaign_season_1',
    campaign_id: campaignId,
  });

  return (
    <ErrorBoundary navigation={navigation} view="SeasonOneCampaignDetailsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
      >
        <HeaderCompactStandard
          title={campaign?.name ?? ''}
          onBack={() => navigation.goBack()}
          backButtonProps={{
            testID: 'season-one-campaign-details-back-button',
          }}
          includesTopInset
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {isLoading && !hasLoaded && !campaign && (
            <Box twClassName="px-4 pt-4 gap-4">
              <Skeleton style={tw.style('h-48 rounded-xl')} />
              <Skeleton style={tw.style('h-32 rounded-xl')} />
            </Box>
          )}

          {!isLoading && hasError && !campaign && (
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

          {campaign && <PreviousSeasonSummary />}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default SeasonOneCampaignDetailsView;
