import React, { useMemo } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import OndoCampaignWinningView from '../components/Campaigns/OndoCampaignWinningView';
import Routes from '../../../../constants/navigation/Routes';
import { selectCampaignById } from '../../../../reducers/rewards/selectors';
import { useSelector } from 'react-redux';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';

// ParamListBase requires an index signature, which interfaces don't support
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OndoCampaignWinningRouteParams = {
  [Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW]: {
    campaignId: string;
    campaignName: string;
  };
};

export const ONDO_CAMPAIGN_WINNING_SCREEN_TEST_IDS = {
  CONTAINER: 'ondo-campaign-winning-screen-container',
} as const;

const OndoCampaignWinningScreenView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<
        OndoCampaignWinningRouteParams,
        typeof Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW
      >
    >();
  const { campaignId, campaignName: campaignNameParam } = route.params;

  const selectCampaign = useMemo(
    () => selectCampaignById(campaignId),
    [campaignId],
  );
  const campaignFromStore = useSelector(selectCampaign);
  const campaignName = campaignNameParam || campaignFromStore?.name || '';

  useTrackRewardsPageView({
    page_type: 'ondo_campaign_winning',
    campaign_id: campaignId,
  });

  return (
    <ErrorBoundary navigation={navigation} view="OndoCampaignWinningScreenView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={ONDO_CAMPAIGN_WINNING_SCREEN_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={campaignName}
          onBack={() => navigation.goBack()}
          includesTopInset
        />
        <OndoCampaignWinningView
          campaignName={campaignName}
          onDismiss={() => navigation.goBack()}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignWinningScreenView;
