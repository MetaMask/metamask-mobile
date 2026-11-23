import React, { useCallback, useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { PredictMarket } from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import { useFeaturedCarouselData } from '../../hooks/useFeaturedCarouselData';
import FeaturedCarouselCard from './FeaturedCarouselCard';
import { FEATURED_CAROUSEL_TEST_IDS } from './FeaturedCarousel.testIds';

export const HORIZONTAL_PADDING = 16;
export const CARD_GAP = 12;
export const CARD_HEIGHT = 280;

const useCarouselLayout = () => {
  const { width: screenWidth } = useWindowDimensions();
  return useMemo(() => {
    const cardWidth = screenWidth - HORIZONTAL_PADDING * 2;
    const snapInterval = cardWidth + CARD_GAP;
    return { cardWidth, snapInterval };
  }, [screenWidth]);
};

const FeaturedCarouselSkeleton: React.FC = () => {
  const tw = useTailwind();
  const { cardWidth } = useCarouselLayout();
  return (
    <Box testID={FEATURED_CAROUSEL_TEST_IDS.SKELETON} twClassName="mx-4">
      <Skeleton
        width={cardWidth}
        height={CARD_HEIGHT}
        style={tw.style('rounded-2xl')}
      />
    </Box>
  );
};

const FeaturedCarousel: React.FC = () => {
  const tw = useTailwind();
  const flashListRef = useRef<FlashListRef<PredictMarket>>(null);
  const { cardWidth, snapInterval } = useCarouselLayout();

  const { markets, isLoading, error } = useFeaturedCarouselData();

  const renderItem = useCallback(
    ({ item: market, index: idx }: { item: PredictMarket; index: number }) => (
      <Box
        style={tw.style(
          { width: cardWidth, height: CARD_HEIGHT },
          idx < markets.length - 1 && { marginRight: CARD_GAP },
        )}
      >
        <FeaturedCarouselCard
          market={market}
          index={idx}
          entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
        />
      </Box>
    ),
    [markets.length, tw, cardWidth],
  );

  const keyExtractor = useCallback(
    (item: PredictMarket) => `carousel-${item.id}`,
    [],
  );

  if (isLoading) {
    return <FeaturedCarouselSkeleton />;
  }

  if (error || markets.length === 0) {
    return null;
  }

  return (
    <Box testID={FEATURED_CAROUSEL_TEST_IDS.CONTAINER}>
      <FlashList
        ref={flashListRef}
        testID={FEATURED_CAROUSEL_TEST_IDS.FLASH_LIST}
        data={markets}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        contentContainerStyle={tw.style(`px-[${HORIZONTAL_PADDING}px]`)}
      />
    </Box>
  );
};

export default FeaturedCarousel;
