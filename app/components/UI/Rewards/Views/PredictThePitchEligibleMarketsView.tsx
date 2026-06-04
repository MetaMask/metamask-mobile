import React, { useCallback, useMemo } from 'react';
import { Image, Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import RewardsInfoBanner from '../components/RewardsInfoBanner';
import { useGetPredictThePitchEligibleMarkets } from '../hooks/useGetPredictThePitchEligibleMarkets';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { getCampaignMechanicsButtonProps } from '../utils/campaignHeaderUtils';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../Predict/constants/eventNames';
import type { PredictThePitchEligibleMarketDto } from '../../../../core/Engine/controllers/rewards-controller/types';

interface PredictThePitchEligibleMarketsRouteParams {
  RewardsPredictThePitchEligibleMarketsView: { campaignId: string };
}

export const PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-eligible-markets-view-container',
  LOADING: 'predict-the-pitch-eligible-markets-loading',
  ERROR: 'predict-the-pitch-eligible-markets-error',
  EMPTY: 'predict-the-pitch-eligible-markets-empty',
  ROW: 'predict-the-pitch-eligible-markets-row',
} as const;

const EligibleMarketIcon: React.FC<{
  market: PredictThePitchEligibleMarketDto;
}> = ({ market }) => {
  const tw = useTailwind();

  if (market.iconUrl) {
    return (
      <Image
        source={{ uri: market.iconUrl }}
        style={tw.style('h-9 w-9 rounded-full bg-muted')}
      />
    );
  }

  return (
    <Box
      twClassName="h-9 w-9 rounded-full bg-muted"
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
    >
      <Icon
        name={IconName.Chart}
        size={IconSize.Md}
        color={IconColor.IconDefault}
      />
    </Box>
  );
};

const PredictThePitchEligibleMarketsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<
        PredictThePitchEligibleMarketsRouteParams,
        'RewardsPredictThePitchEligibleMarketsView'
      >
    >();
  const { campaignId } = route.params;

  useTrackRewardsPageView({
    page_type: 'predict_the_pitch_eligible_markets',
    campaign_id: campaignId,
  });

  const { eligibleMarkets, isLoading, hasError, refetch } =
    useGetPredictThePitchEligibleMarkets();

  const sections = useMemo(
    () => [
      {
        title: strings('rewards.predict_the_pitch_campaign.eligible_games'),
        markets: eligibleMarkets?.games ?? [],
      },
      {
        title: strings('rewards.predict_the_pitch_campaign.eligible_props'),
        markets: eligibleMarkets?.props ?? [],
      },
    ],
    [eligibleMarkets],
  );
  const totalMarkets = sections.reduce(
    (sum, section) => sum + section.markets.length,
    0,
  );

  const openMarket = useCallback(
    (market: PredictThePitchEligibleMarketDto) => {
      if (!market.navId) return;
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: market.navId,
          entryPoint: PredictEventValues.ENTRY_POINT.REWARDS,
        },
      });
    },
    [navigation],
  );

  return (
    <ErrorBoundary
      navigation={navigation}
      view="PredictThePitchEligibleMarketsView"
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderStandard
          title={strings(
            'rewards.predict_the_pitch_campaign.eligible_markets_title',
          )}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{
            testID: 'predict-the-pitch-eligible-markets-back-button',
          }}
          endButtonIconProps={getCampaignMechanicsButtonProps(
            true,
            () =>
              navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
                campaignId,
              }),
            'predict-the-pitch-eligible-markets-mechanics-button',
          )}
          includesTopInset
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 pb-4 gap-5')}
        >
          {isLoading && !eligibleMarkets && (
            <Box
              twClassName="gap-3"
              testID={PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW_TEST_IDS.LOADING}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} style={tw.style('h-12 rounded-lg')} />
              ))}
            </Box>
          )}

          {hasError && !eligibleMarkets && (
            <RewardsErrorBanner
              title={strings(
                'rewards.predict_the_pitch_campaign.eligible_markets_error',
              )}
              description={strings(
                'rewards.predict_the_pitch_campaign.eligible_markets_error_description',
              )}
              onConfirm={refetch}
              confirmButtonLabel={strings(
                'rewards.predict_the_pitch_campaign.positions_retry',
              )}
              testID={PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW_TEST_IDS.ERROR}
            />
          )}

          {!isLoading && !hasError && totalMarkets === 0 && (
            <RewardsInfoBanner
              title={strings(
                'rewards.predict_the_pitch_campaign.eligible_markets_empty',
              )}
              description={strings(
                'rewards.predict_the_pitch_campaign.eligible_markets_empty_description',
              )}
              showInfoIcon={false}
              testID={PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW_TEST_IDS.EMPTY}
            />
          )}

          {sections.map((section) =>
            section.markets.length > 0 ? (
              <Box key={section.title} twClassName="gap-2">
                <Text variant={TextVariant.HeadingSm}>{section.title}</Text>
                {section.markets.map((market, index) => (
                  <Pressable
                    key={`${market.conditionId}-${index}`}
                    disabled={!market.navId}
                    onPress={() => openMarket(market)}
                    testID={`${PREDICT_THE_PITCH_ELIGIBLE_MARKETS_VIEW_TEST_IDS.ROW}-${market.conditionId}`}
                  >
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      justifyContent={BoxJustifyContent.Between}
                      twClassName="gap-3 py-2"
                    >
                      <EligibleMarketIcon market={market} />
                      <Box twClassName="flex-1 min-w-0">
                        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
                          {market.displayName}
                        </Text>
                        <Text
                          variant={TextVariant.BodySm}
                          color={TextColor.TextAlternative}
                          numberOfLines={1}
                        >
                          {market.eventSlug ?? market.marketSlug ?? '-'}
                        </Text>
                      </Box>
                      {market.navId && (
                        <Icon
                          name={IconName.ArrowRight}
                          size={IconSize.Md}
                          color={IconColor.IconAlternative}
                        />
                      )}
                    </Box>
                  </Pressable>
                ))}
              </Box>
            ) : null,
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PredictThePitchEligibleMarketsView;
