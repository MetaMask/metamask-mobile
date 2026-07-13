import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Box,
  FontWeight,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import {
  PredictThePitchOpenPositionRow,
  PredictThePitchResolvedPositionRow,
  PredictThePitchSoldPositionRow,
} from '../components/Campaigns/PredictThePitchPositionRows';
import { groupPositionsByDate } from '../components/Campaigns/PredictThePitchPortfolio.utils';
import { PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS } from '../components/Campaigns/PredictThePitchPortfolio';
import { useGetPredictThePitchPositions } from '../hooks/useGetPredictThePitchPositions';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import RewardsInfoBanner from '../components/RewardsInfoBanner';
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
  POSITIONS: 'predict-the-pitch-portfolio-sections-container',
  OPEN_SECTION: 'predict-the-pitch-portfolio-open-section',
  CLOSED_SECTION: 'predict-the-pitch-portfolio-closed-section',
  DATE_HEADER: 'predict-the-pitch-portfolio-date-header',
  DIVIDER: 'predict-the-pitch-portfolio-section-divider',
} as const;

const SKELETON_ROW_COUNT = 5;

const PredictThePitchCampaignPortfolioSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="gap-3 py-1"
      testID={PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.LOADING}
    >
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <Box key={index} twClassName="flex-row items-start gap-4 py-2">
          <Skeleton width={40} height={40} style={tw.style('rounded-full')} />
          <Box twClassName="flex-1 gap-2">
            <Skeleton width="100%" height={18} style={tw.style('rounded-md')} />
            <Skeleton width="70%" height={16} style={tw.style('rounded-md')} />
          </Box>
          <Box twClassName="items-end gap-2">
            <Skeleton width={64} height={18} style={tw.style('rounded-md')} />
            <Skeleton width={48} height={16} style={tw.style('rounded-md')} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

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

  const openPositions = useMemo(
    () => positions?.openPositions ?? [],
    [positions?.openPositions],
  );
  const resolvedPositions = useMemo(
    () => positions?.resolvedPositions ?? [],
    [positions?.resolvedPositions],
  );
  const isEmpty = openPositions.length === 0 && resolvedPositions.length === 0;

  const openGrouped = useMemo(
    () => groupPositionsByDate(openPositions),
    [openPositions],
  );
  const closedGrouped = useMemo(
    () => groupPositionsByDate(resolvedPositions),
    [resolvedPositions],
  );

  const renderPositionsContent = () => {
    if (isLoading && !positions) {
      return (
        <Box twClassName="px-4">
          <PredictThePitchCampaignPortfolioSkeleton />
        </Box>
      );
    }

    if (hasError && !positions) {
      return (
        <Box twClassName="px-4">
          <RewardsErrorBanner
            title={strings(
              'rewards.predict_the_pitch_campaign.positions_error',
            )}
            description={strings(
              'rewards.predict_the_pitch_campaign.positions_error_description',
            )}
            onConfirm={refetch}
            confirmButtonLabel={strings(
              'rewards.predict_the_pitch_campaign.positions_retry',
            )}
            testID={PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.ERROR}
          />
        </Box>
      );
    }

    if (isEmpty) {
      return (
        <Box twClassName="px-4">
          <RewardsInfoBanner
            title={strings(
              'rewards.predict_the_pitch_campaign.positions_empty',
            )}
            description={strings(
              'rewards.predict_the_pitch_campaign.positions_empty_description',
            )}
            showInfoIcon={false}
            testID={PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.EMPTY}
          />
        </Box>
      );
    }

    let rowIndex = 0;
    const testIds = PREDICT_THE_PITCH_CAMPAIGN_PORTFOLIO_VIEW_TEST_IDS;

    return (
      <Box testID={testIds.POSITIONS}>
        {openPositions.length > 0 && (
          <Box testID={testIds.OPEN_SECTION} twClassName="px-4">
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {strings(
                'rewards.predict_the_pitch_campaign.positions_open_section',
              )}
            </Text>
            {openGrouped.map((item) => {
              if (item.kind === 'date-header') {
                return (
                  <Box
                    key={`open-header-${item.dateKey}`}
                    twClassName="pt-3 pb-1"
                  >
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                      testID={`${testIds.DATE_HEADER}-open-${item.dateKey}`}
                    >
                      {item.label}
                    </Text>
                  </Box>
                );
              }

              const currentIndex = rowIndex;
              rowIndex += 1;

              return (
                <PredictThePitchOpenPositionRow
                  key={`${item.position.outcomeAssetId}-${item.index}`}
                  position={item.position}
                  index={currentIndex}
                />
              );
            })}
          </Box>
        )}

        {openPositions.length > 0 && resolvedPositions.length > 0 && (
          <Box
            twClassName="my-4 border-b border-border-muted"
            testID={testIds.DIVIDER}
          />
        )}

        {resolvedPositions.length > 0 && (
          <Box testID={testIds.CLOSED_SECTION} twClassName="px-4">
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {strings(
                'rewards.predict_the_pitch_campaign.positions_closed_section',
              )}
            </Text>
            {closedGrouped.map((item) => {
              if (item.kind === 'date-header') {
                return (
                  <Box
                    key={`closed-header-${item.dateKey}`}
                    twClassName="pt-3 pb-1"
                  >
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                      testID={`${testIds.DATE_HEADER}-closed-${item.dateKey}`}
                    >
                      {item.label}
                    </Text>
                  </Box>
                );
              }

              const currentIndex = rowIndex;
              rowIndex += 1;

              if (item.position.status === 'resolved') {
                return (
                  <PredictThePitchResolvedPositionRow
                    key={`${item.position.outcomeAssetId}-${item.index}`}
                    position={item.position}
                    index={currentIndex}
                  />
                );
              }

              return (
                <PredictThePitchSoldPositionRow
                  key={`${item.position.outcomeAssetId}-${item.index}`}
                  position={item.position}
                  index={currentIndex}
                />
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

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
          contentContainerStyle={tw.style('pb-4')}
        >
          {renderPositionsContent()}
          {positions?.computedAt && (
            <Box twClassName="px-4">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                twClassName="mb-3 mt-4"
              >
                {strings(
                  'rewards.predict_the_pitch_campaign.positions_last_updated',
                  {
                    time: formatRewardsTimeOnly(new Date(positions.computedAt)),
                  },
                )}
              </Text>
            </Box>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PredictThePitchCampaignPortfolioView;
