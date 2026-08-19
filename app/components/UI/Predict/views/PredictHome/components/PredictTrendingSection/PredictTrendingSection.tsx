import React, { useCallback } from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../../core/Engine';
import PredictMarket from '../../../../components/PredictMarket';
import PredictMarketSkeleton from '../../../../components/PredictMarketSkeleton';
import { PredictEventValues } from '../../../../constants/eventNames';
import { PREDICT_TRENDING_SECTION_TEST_IDS } from './PredictTrendingSection.testIds';
import {
  TRENDING_DISPLAY_LIMIT,
  usePredictTrendingSection,
} from './usePredictTrendingSection';

interface PredictTrendingSectionProps {
  testID?: string;
}

/**
 * Predict home "Trending" section (PRED-834).
 *
 * Vertical list of full-width market/event cards ordered by 24h volume (see
 * {@link usePredictTrendingSection}), reusing the shared `PredictMarket` card.
 * Renders skeletons while loading. Unlike the other home sections it never
 * disappears — it is the feed's fallback anchor, so an empty/error result shows
 * an "Unable to load" message instead. The header opens the generic Trending
 * feed (`feedId: 'trending'`).
 */
const PredictTrendingSection: React.FC<PredictTrendingSectionProps> = ({
  testID = PREDICT_TRENDING_SECTION_TEST_IDS.SECTION,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { markets, isLoading, showEmptyState } = usePredictTrendingSection();

  const handleSeeAll = useCallback(() => {
    Engine.context.PredictController.trackHomeSectionInteraction({
      sectionId: PredictEventValues.SECTION_ID.TRENDING,
      actionType: PredictEventValues.ACTION_TYPE.SEE_ALL,
      entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
    });
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.FEED,
      params: {
        feedId: 'trending',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      },
    });
  }, [navigation]);

  return (
    <Box testID={testID}>
      {/* Same design-system SectionHeader as Live now / Popular today so the
          trailing arrow uses the shared icon size. */}
      <SectionHeader
        testID={PREDICT_TRENDING_SECTION_TEST_IDS.HEADER}
        title={strings('predict.home.trending_title')}
        isInteractive
        onPress={handleSeeAll}
        endIconProps={{
          testID: PREDICT_TRENDING_SECTION_TEST_IDS.HEADER_CHEVRON,
        }}
        twClassName="px-0 pt-0 mb-1"
      />

      {isLoading ? (
        <Box twClassName="gap-3">
          {Array.from({ length: TRENDING_DISPLAY_LIMIT }).map((_, index) => (
            <PredictMarketSkeleton
              key={`${PREDICT_TRENDING_SECTION_TEST_IDS.SKELETON_PREFIX}-${index}`}
              testID={`${PREDICT_TRENDING_SECTION_TEST_IDS.SKELETON_PREFIX}-${index}`}
            />
          ))}
        </Box>
      ) : showEmptyState ? (
        <Box
          testID={PREDICT_TRENDING_SECTION_TEST_IDS.ERROR_STATE}
          twClassName="items-center justify-center rounded-xl bg-muted py-8 px-4"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('predict.home.trending_unable_to_load')}
          </Text>
        </Box>
      ) : (
        <Box twClassName="gap-1">
          {markets.map((market) => (
            <PredictMarket
              key={market.id}
              market={market}
              entryPoint={PredictEventValues.ENTRY_POINT.HOME_SECTION}
              testID={`${PREDICT_TRENDING_SECTION_TEST_IDS.CARD_PREFIX}-${market.id}`}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PredictTrendingSection;
