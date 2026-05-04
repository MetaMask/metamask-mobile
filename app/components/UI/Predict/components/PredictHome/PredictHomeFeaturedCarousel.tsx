import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
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
  const tw = useTailwind();
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
      <TouchableOpacity
        testID={PREDICT_HOME_FEATURED_CAROUSEL_TEST_IDS.HEADER}
        style={tw.style('flex-row items-center mb-2')}
        onPress={handleHeaderPress}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {strings('predict.category.trending')}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      </TouchableOpacity>
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
