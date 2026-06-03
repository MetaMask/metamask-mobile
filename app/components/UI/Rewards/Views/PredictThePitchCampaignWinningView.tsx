import React, { useCallback, useEffect, useMemo } from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import Routes from '../../../../constants/navigation/Routes';
import CopyableField from '../components/ReferralDetails/CopyableField';
import { useGetPredictThePitchOutcome } from '../hooks/useGetPredictThePitchOutcome';
import { useGetPredictThePitchLeaderboardPosition } from '../hooks/useGetPredictThePitchLeaderboardPosition';
import { formatOrdinalRank, formatSignedUsd } from '../utils/formatUtils';
import { strings } from '../../../../../locales/i18n';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';

interface PredictThePitchCampaignWinningRouteParams {
  RewardsPredictThePitchCampaignWinning: {
    campaignId: string;
    campaignName: string;
  };
}

export const PREDICT_THE_PITCH_CAMPAIGN_WINNING_VIEW_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-campaign-winning-view-container',
  RANK: 'predict-the-pitch-campaign-winning-rank',
  RESULT: 'predict-the-pitch-campaign-winning-result',
} as const;

const PredictThePitchCampaignWinningView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<
      RouteProp<
        PredictThePitchCampaignWinningRouteParams,
        'RewardsPredictThePitchCampaignWinning'
      >
    >();
  const { campaignId, campaignName } = route.params;

  const { outcome, isLoading: isOutcomeLoading } =
    useGetPredictThePitchOutcome(campaignId);
  const { position, isLoading: isPositionLoading } =
    useGetPredictThePitchLeaderboardPosition(campaignId);

  useTrackRewardsPageView({
    page_type: 'predict_the_pitch_campaign_winning',
    campaign_id: campaignId,
  });

  useEffect(() => {
    if (!isOutcomeLoading && outcome && !outcome.winnerVerificationCode) {
      navigation.navigate(
        Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
        {
          campaignId,
        },
      );
    }
  }, [campaignId, isOutcomeLoading, navigation, outcome]);

  const rankDisplay = useMemo(() => {
    const rank = outcome?.rank ?? position?.rank;
    return rank ? formatOrdinalRank(rank) : null;
  }, [outcome?.rank, position?.rank]);

  const resultDisplay = useMemo(
    () => (position ? formatSignedUsd(position.pnl) : null),
    [position],
  );

  const handleDone = useCallback(() => {
    navigation.navigate(
      Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
      {
        campaignId,
      },
    );
  }, [campaignId, navigation]);

  return (
    <ErrorBoundary
      navigation={navigation}
      view="PredictThePitchCampaignWinningView"
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={PREDICT_THE_PITCH_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderStandard
          title={campaignName}
          onBack={handleDone}
          backButtonProps={{
            testID: 'predict-the-pitch-campaign-winning-back-button',
          }}
          includesTopInset
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('grow gap-6 px-4 py-6')}
        >
          <Box twClassName="gap-3">
            <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
              {strings('rewards.campaign_winning.you_won')}
            </Text>
            {rankDisplay ? (
              <Text
                variant={TextVariant.DisplayMd}
                color={TextColor.TextDefault}
                testID={PREDICT_THE_PITCH_CAMPAIGN_WINNING_VIEW_TEST_IDS.RANK}
              >
                {rankDisplay}
              </Text>
            ) : null}
            {resultDisplay ? (
              <Text
                variant={TextVariant.HeadingSm}
                color={TextColor.SuccessDefault}
                testID={PREDICT_THE_PITCH_CAMPAIGN_WINNING_VIEW_TEST_IDS.RESULT}
              >
                {resultDisplay}
              </Text>
            ) : isPositionLoading ? (
              <Skeleton style={tw.style('h-6 w-28 rounded-lg')} />
            ) : null}
          </Box>
          <CopyableField
            value={outcome?.winnerVerificationCode ?? null}
            valueLoading={isOutcomeLoading}
          />
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleDone}
          >
            {strings('rewards.campaign_winning.skip_for_now')}
          </Button>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PredictThePitchCampaignWinningView;
