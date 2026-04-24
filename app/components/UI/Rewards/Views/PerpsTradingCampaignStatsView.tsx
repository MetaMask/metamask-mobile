import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconName,
  IconColor,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import PerpsTradingCampaignStatsHeader from '../components/Campaigns/PerpsTradingCampaignStatsHeader';
import { StatCell } from '../components/Campaigns/OndoCampaignStatsSummary';
import { useGetPerpsTradingCampaignLeaderboardPosition } from '../hooks/useGetPerpsTradingCampaignLeaderboardPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { selectCampaignById } from '../../../../reducers/rewards/selectors';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';
import { PERPS_QUALIFICATION_NOTIONAL_USD } from '../utils/perpsCampaignConstants';
import {
  formatComputedAt,
  formatSignedUsd,
  formatUsd,
} from '../utils/formatUtils';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PerpsTradingCampaignStatsRouteParams = {
  RewardsPerpsTradingCampaignStats: { campaignId: string };
};

export const PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS = {
  CONTAINER: 'perps-campaign-stats-view-container',
  PERFORMANCE_PNL: 'perps-campaign-stats-view-performance-pnl',
  PERFORMANCE_VOLUME: 'perps-campaign-stats-view-performance-volume',
  PERFORMANCE_MARGIN: 'perps-campaign-stats-view-performance-margin',
  QUALIFIED_CARD: 'perps-campaign-stats-view-qualified-card',
  QUALIFY_FOR_RANK_CARD: 'perps-campaign-stats-view-qualify-for-rank-card',
  LAST_COMPUTED: 'perps-campaign-stats-view-last-computed',
} as const;

const CheckIcon: React.FC = () => (
  <Icon
    name={IconName.Check}
    size={IconSize.Sm}
    color={IconColor.SuccessDefault}
  />
);

const PerpsTradingCampaignStatsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<
        PerpsTradingCampaignStatsRouteParams,
        'RewardsPerpsTradingCampaignStats'
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

  const { position, isLoading } = useGetPerpsTradingCampaignLeaderboardPosition(
    isOptedIn ? campaignId : undefined,
  );

  const pnlValue = position ? formatSignedUsd(position.pnl) : '—';
  const pnlColor = position
    ? position.pnl >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault
    : TextColor.TextDefault;

  const volumeValue = position ? formatUsd(position.notionalVolume) : '—';
  const marginValue = position ? formatUsd(position.marginDeployed) : '—';
  const isQualified = position != null && position.qualified;
  const isPending = position != null && !position.qualified;

  const isCampaignComplete =
    campaign != null && getCampaignStatus(campaign) === 'complete';

  const notionalGap = position
    ? Math.max(0, PERPS_QUALIFICATION_NOTIONAL_USD - position.notionalVolume)
    : 0;

  const showQualifiedCard =
    !isCampaignComplete && isQualified && position != null;

  const showQualifyForRankCard =
    !isCampaignComplete && isPending && position != null && notionalGap > 0;

  const lastComputedSubtext = position
    ? formatComputedAt(position.computedAt)
    : '';

  return (
    <ErrorBoundary navigation={navigation} view="PerpsTradingCampaignStatsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.perps_trading_campaign.stats_title')}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'perps-stats-back-button' }}
          endButtonIconProps={getCampaignMechanicsButtonProps(
            campaign != null,
            () =>
              navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
                campaignId,
              }),
            'perps-stats-mechanics-button',
          )}
          includesTopInset
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          <Box twClassName="p-4">
            <PerpsTradingCampaignStatsHeader
              position={position}
              isLoading={isLoading}
              showComputedAt={false}
              showPnl={false}
            />
          </Box>
          <Box twClassName="my-1 border-b border-border-muted" />
          <Box twClassName="p-4 gap-3">
            <Text variant={TextVariant.HeadingMd}>
              {strings('rewards.perps_trading_campaign.performance_title')}
            </Text>

            <Box flexDirection={BoxFlexDirection.Row}>
              <StatCell
                label={strings('rewards.perps_trading_campaign.label_pnl')}
                value={pnlValue}
                isLoading={isLoading}
                valueColor={pnlColor}
                testID={PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_PNL}
              />
              <Box twClassName="flex-1" />
            </Box>

            <Box flexDirection={BoxFlexDirection.Row}>
              <StatCell
                label={strings('rewards.perps_trading_campaign.label_volume')}
                value={volumeValue}
                isLoading={isLoading}
                suffix={isQualified ? <CheckIcon /> : undefined}
                testID={PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_VOLUME}
              />
              <StatCell
                label={strings('rewards.perps_trading_campaign.label_margin')}
                value={marginValue}
                isLoading={isLoading}
                suffix={isQualified ? <CheckIcon /> : undefined}
                testID={PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.PERFORMANCE_MARGIN}
              />
            </Box>

            {showQualifiedCard && (
              <Box
                twClassName="bg-muted rounded-xl p-4 gap-2"
                testID={PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFIED_CARD}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {strings(
                    'rewards.perps_trading_campaign.stats_qualified_title',
                  )}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings(
                    'rewards.perps_trading_campaign.stats_qualified_description',
                  )}
                </Text>
              </Box>
            )}

            {showQualifyForRankCard && (
              <Box
                twClassName="bg-muted rounded-xl p-4 gap-2"
                testID={
                  PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.QUALIFY_FOR_RANK_CARD
                }
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-2"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                  >
                    {strings(
                      'rewards.perps_trading_campaign.stats_qualify_for_rank_title',
                    )}
                  </Text>
                </Box>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings(
                    'rewards.perps_trading_campaign.stats_qualify_for_rank_description',
                    {
                      notionalRemaining: formatUsd(notionalGap),
                    },
                  )}
                </Text>
              </Box>
            )}
          </Box>
          {lastComputedSubtext.length > 0 && (
            <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
                testID={PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS.LAST_COMPUTED}
              >
                {lastComputedSubtext}
              </Text>
            </Box>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PerpsTradingCampaignStatsView;
