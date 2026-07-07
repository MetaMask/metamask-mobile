import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box, SectionHeader } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import HorizontalCarousel from '../../../../Views/TrendingView/components/HorizontalCarousel';
import { usePredictionsFeed } from '../../../../Views/TrendingView/feeds/predictions/usePredictionsFeed';
import { PredictionCarouselRowItem } from '../../../../Views/TrendingView/feeds/predictions/PredictionRowItem';
import PredictionsSkeleton from '../../../../Views/TrendingView/feeds/predictions/PredictionsSkeleton';
import type { PredictMarket as PredictMarketType } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import { PredictEntryPointProvider } from '../../contexts';
import { PREDICT_HOME_FEATURED_CAROUSEL_TEST_IDS } from './PredictHomeFeaturedCarousel.testIds';

interface PredictHomeFeaturedCarouselProps {
  testID?: string;
}

const PredictHomeFeaturedCarousel: React.FC<
  PredictHomeFeaturedCarouselProps
> = ({ testID = PREDICT_HOME_FEATURED_CAROUSEL_TEST_IDS.CAROUSEL }) => {
  const navigation = useNavigation();
  const predictions = usePredictionsFeed({ variant: 'trending' });

  const handleHeaderPress = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED_CAROUSEL,
      },
    });
  }, [navigation]);

  const renderItem: ListRenderItem<PredictMarketType> = useCallback(
    ({ item }) => (
      <PredictionCarouselRowItem
        market={item}
        testIdPrefix="predict-market-row-item"
      />
    ),
    [],
  );

  return (
    <Box testID={testID}>
      <SectionHeader
        testID={PREDICT_HOME_FEATURED_CAROUSEL_TEST_IDS.HEADER}
        title={strings('predict.category.trending')}
        isInteractive
        onPress={handleHeaderPress}
      />
      <PredictEntryPointProvider
        entryPoint={PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED_CAROUSEL}
      >
        <HorizontalCarousel<PredictMarketType>
          data={predictions.data}
          isLoading={predictions.isLoading}
          renderItem={renderItem}
          Skeleton={PredictionsSkeleton}
          idPrefix="predict-home-featured"
        />
      </PredictEntryPointProvider>
    </Box>
  );
};

export default PredictHomeFeaturedCarousel;
