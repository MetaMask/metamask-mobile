import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import PredictThePitchStatsHeader from '../components/Campaigns/PredictThePitchStatsHeader';
import { StatCell } from '../components/Campaigns/OndoCampaignStatsSummary';
import { useGetPredictThePitchLeaderboardPosition } from '../hooks/useGetPredictThePitchLeaderboardPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { selectCampaignById } from '../../../../reducers/rewards/selectors';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';
import {
  formatPercentChange,
  formatRewardsTimeOnly,
  formatSignedUsd,
  formatUsd,
} from '../utils/formatUtils';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PredictThePitchCampaignStatsRouteParams = {
  RewardsPredictThePitchCampaignStats: { campaignId: string };
};

export const PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-campaign-stats-view-container',
  PERFORMANCE_ROI: 'predict-the-pitch-campaign-stats-view-performance-roi',
  PERFORMANCE_PNL: 'predict-the-pitch-campaign-stats-view-performance-pnl',
  PERFORMANCE_VOLUME:
    'predict-the-pitch-campaign-stats-view-performance-volume',
  PERFORMANCE_MARKETS_TRADED:
    'predict-the-pitch-campaign-stats-view-performance-markets-traded',
  QUALIFIED_CARD: 'predict-the-pitch-campaign-stats-view-qualified-card',
  QUALIFY_FOR_RANK_CARD:
    'predict-the-pitch-campaign-stats-view-qualify-for-rank-card',
  LAST_COMPUTED: 'predict-the-pitch-campaign-stats-view-last-computed',
} as const;

const getMetricColor = (value: number | null): TextColor => {
  if (value == null) {
    return TextColor.TextDefault;
  }
  return value >= 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault;
};

const PredictThePitchCampaignStatsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<
        PredictThePitchCampaignStatsRouteParams,
        'RewardsPredictThePitchCampaignStats'
      >
    >();
  const { campaignId } = route.params;

  const selectCampaign = useMemo(
    () => selectCampaignById(campaignId),
    [campaignId],
  );
  const campaign = useSelector(selectCampaign);

  const { status: participantStatusData } =
    useGetCampaignParticipantStatus(campaignId);
  const isOptedIn = participantStatusData?.optedIn === true;

  const { position, isLoading, hasError, refetch } =
    useGetPredictThePitchLeaderboardPosition(
      isOptedIn ? campaignId : undefined,
    );

  const showSkeleton = isLoading && !position;
  const positionError = hasError && !position;

  const roi =
    position != null && Number.isFinite(position.roi) ? position.roi : null;
  const pnl =
    position != null && Number.isFinite(position.pnl) ? position.pnl : null;
  const volume =
    position != null && Number.isFinite(position.volume)
      ? position.volume
      : null;

  const roiDisplay = roi != null ? formatPercentChange(roi) : '-';
  const pnlDisplay = pnl != null ? formatSignedUsd(pnl) : '-';
  const volumeDisplay = volume != null ? formatUsd(volume) : '-';

  const marketsTraded = position?.marketsTraded ?? null;
  const minimumMarketsTraded = position?.minimumMarketsTraded ?? null;
  const showMarketsTraded =
    marketsTraded != null && minimumMarketsTraded != null;
  const marketsDisplay = showMarketsTraded
    ? marketsTraded < minimumMarketsTraded
      ? `${marketsTraded}/${minimumMarketsTraded}`
      : String(marketsTraded)
    : '';

  const isPending = position != null && !position.eligible;
  const isEligible = position != null && position.eligible;

  const isCampaignComplete =
    campaign != null && getCampaignStatus(campaign) === 'complete';

  const showQualifiedCard =
    !isCampaignComplete && isEligible && position != null;

  const showQualifyForRankCard =
    !isCampaignComplete && isPending && position != null;

  return (
    <ErrorBoundary
      navigation={navigation}
      view="PredictThePitchCampaignStatsView"
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.predict_the_pitch_campaign.stats_title')}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'predict-the-pitch-stats-back-button' }}
          endButtonIconProps={getCampaignMechanicsButtonProps(
            campaign != null,
            () =>
              navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
                campaignId,
              }),
            'predict-the-pitch-stats-mechanics-button',
          )}
          includesTopInset
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          <Box twClassName="p-4">
            <PredictThePitchStatsHeader
              position={position}
              isLoading={isLoading}
              showRoi={false}
              showComputedAt={false}
              isCampaignComplete={isCampaignComplete}
            />
          </Box>
          <Box twClassName="my-1 border-b border-border-muted" />
          <Box twClassName="p-4 gap-3">
            <Text variant={TextVariant.HeadingMd}>
              {strings('rewards.predict_the_pitch_campaign.performance_title')}
            </Text>

            <Box flexDirection={BoxFlexDirection.Row}>
              <StatCell
                label={strings('rewards.predict_the_pitch_campaign.label_roi')}
                value={roiDisplay}
                isLoading={showSkeleton}
                valueColor={getMetricColor(roi)}
                testID={
                  PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_ROI
                }
              />
              <StatCell
                label={strings('rewards.predict_the_pitch_campaign.label_pnl')}
                value={pnlDisplay}
                isLoading={showSkeleton}
                valueColor={getMetricColor(pnl)}
                testID={
                  PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_PNL
                }
              />
            </Box>
            <Box flexDirection={BoxFlexDirection.Row}>
              <StatCell
                label={strings(
                  'rewards.predict_the_pitch_campaign.label_total_volume',
                )}
                value={volumeDisplay}
                isLoading={showSkeleton}
                testID={
                  PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_VOLUME
                }
              />
              {showMarketsTraded ? (
                <StatCell
                  label={strings(
                    'rewards.predict_the_pitch_campaign.label_markets_traded',
                  )}
                  value={marketsDisplay}
                  isLoading={showSkeleton}
                  testID={
                    PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_MARKETS_TRADED
                  }
                />
              ) : (
                <Box twClassName="flex-1" />
              )}
            </Box>

            {showQualifiedCard && (
              <Box
                twClassName="bg-muted rounded-xl p-4 gap-2"
                testID={
                  PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFIED_CARD
                }
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {strings(
                    'rewards.predict_the_pitch_campaign.stats_qualified_title',
                  )}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings(
                    'rewards.predict_the_pitch_campaign.stats_qualified_description',
                  )}
                </Text>
              </Box>
            )}

            {showQualifyForRankCard && (
              <Box
                twClassName="bg-muted rounded-xl p-4 gap-2"
                testID={
                  PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFY_FOR_RANK_CARD
                }
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {strings(
                    'rewards.predict_the_pitch_campaign.stats_qualify_for_rank_title',
                  )}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings(
                    'rewards.predict_the_pitch_campaign.stats_qualify_for_rank_description',
                  )}
                </Text>
              </Box>
            )}

            {position?.computedAt && (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                testID={
                  PREDICT_THE_PITCH_CAMPAIGN_STATS_VIEW_TEST_IDS.LAST_COMPUTED
                }
              >
                {strings('rewards.predict_the_pitch_campaign.last_updated', {
                  time: formatRewardsTimeOnly(new Date(position.computedAt)),
                })}
              </Text>
            )}

            {positionError && (
              <RewardsErrorBanner
                title={strings(
                  'rewards.predict_the_pitch_campaign.stats_error_title',
                )}
                description={strings(
                  'rewards.predict_the_pitch_campaign.stats_error_description',
                )}
                onConfirm={refetch}
                confirmButtonLabel={strings(
                  'rewards.predict_the_pitch_campaign.stats_retry',
                )}
              />
            )}
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PredictThePitchCampaignStatsView;
