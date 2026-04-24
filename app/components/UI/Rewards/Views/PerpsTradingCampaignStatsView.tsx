import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextVariant } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import PerpsTradingCampaignStatsHeader from '../components/Campaigns/PerpsTradingCampaignStatsHeader';
import { useGetPerpsTradingCampaignLeaderboardPosition } from '../hooks/useGetPerpsTradingCampaignLeaderboardPosition';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { selectCampaignById } from '../../../../reducers/rewards/selectors';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PerpsTradingCampaignStatsRouteParams = {
  RewardsPerpsTradingCampaignStats: { campaignId: string };
};

export const PERPS_CAMPAIGN_STATS_VIEW_TEST_IDS = {
  CONTAINER: 'perps-campaign-stats-view-container',
} as const;

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
          contentContainerStyle={tw.style('p-4 pb-8')}
        >
          <PerpsTradingCampaignStatsHeader
            position={position}
            isLoading={isLoading}
          />
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PerpsTradingCampaignStatsView;
