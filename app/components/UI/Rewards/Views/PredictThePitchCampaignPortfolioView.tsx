import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import PredictThePitchPortfolio from '../components/Campaigns/PredictThePitchPortfolio';
import { useGetPredictThePitchPositions } from '../hooks/useGetPredictThePitchPositions';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';
import { formatRewardsTimeOnly } from '../utils/formatUtils';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PredictThePitchCampaignPortfolioRouteParams = {
  RewardsPredictThePitchCampaignPortfolioView: { campaignId: string };
};

export const PREDICT_THE_PITCH_CAMPAIGN_PORTFOLIO_VIEW_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-campaign-portfolio-view-container',
} as const;

const PredictThePitchCampaignPortfolioView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<
        PredictThePitchCampaignPortfolioRouteParams,
        'RewardsPredictThePitchCampaignPortfolioView'
      >
    >();
  const { campaignId } = route.params;

  useTrackRewardsPageView({
    page_type: 'predict_the_pitch_campaign_portfolio',
    campaign_id: campaignId,
  });

  const { positions, isLoading, hasError, refetch } =
    useGetPredictThePitchPositions(campaignId);

  return (
    <ErrorBoundary
      navigation={navigation}
      view="PredictThePitchCampaignPortfolioView"
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={PREDICT_THE_PITCH_CAMPAIGN_PORTFOLIO_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderStandard
          title={strings('rewards.predict_the_pitch_campaign.positions_title')}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{
            testID: 'predict-the-pitch-portfolio-back-button',
          }}
          endButtonIconProps={getCampaignMechanicsButtonProps(
            true,
            () =>
              navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
                campaignId,
              }),
            'predict-the-pitch-portfolio-mechanics-button',
          )}
          includesTopInset
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 pb-4')}
        >
          {positions?.computedAt && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="mb-3"
            >
              {strings(
                'rewards.predict_the_pitch_campaign.positions_last_updated',
                { time: formatRewardsTimeOnly(new Date(positions.computedAt)) },
              )}
            </Text>
          )}
          <PredictThePitchPortfolio
            positions={positions}
            isLoading={isLoading}
            hasError={hasError}
            refetch={refetch}
          />
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PredictThePitchCampaignPortfolioView;
