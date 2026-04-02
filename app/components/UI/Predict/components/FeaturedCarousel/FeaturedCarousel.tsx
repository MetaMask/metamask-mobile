import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { PredictMarket } from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import { useFeaturedCarouselData } from '../../hooks/useFeaturedCarouselData';
import FeaturedCarouselCard from './FeaturedCarouselCard';
import { FEATURED_CAROUSEL_TEST_IDS } from './FeaturedCarousel.testIds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const HORIZONTAL_PADDING = 16;
export const CARD_GAP = 12;
export const CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
export const CARD_HEIGHT = 280;
export const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

const FeaturedCarouselSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <Box testID={FEATURED_CAROUSEL_TEST_IDS.SKELETON} twClassName="mx-4">
      <Skeleton
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        style={tw.style('rounded-2xl')}
      />
    </Box>
  );
};

interface PaginationDotsProps {
  count: number;
  activeIndex: number;
}

export const PaginationDots: React.FC<PaginationDotsProps> = ({
  count,
  activeIndex,
}) => {
  const tw = useTailwind();

  if (count <= 1) return null;

  return (
    <Box
      testID={FEATURED_CAROUSEL_TEST_IDS.PAGINATION_DOTS}
      twClassName="flex-row justify-center items-center gap-2 mt-3"
    >
      {Array.from({ length: count }).map((_, dotPosition) => (
        <View
          key={`pagination-dot-${dotPosition}`}
          style={tw.style(
            'h-2 rounded-full',
            dotPosition === activeIndex
              ? 'bg-icon-alternative'
              : 'bg-icon-muted w-2',
            dotPosition === activeIndex && { width: 35 },
          )}
        />
      ))}
    </Box>
  );
};

const FeaturedCarousel: React.FC = () => {
  const tw = useTailwind();
  const flashListRef = useRef<FlashListRef<PredictMarket>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { markets, isLoading, error } = useFeaturedCarouselData();

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.min(
        Math.max(0, Math.round(offsetX / SNAP_INTERVAL)),
        markets.length - 1,
      );
      setActiveIndex(newIndex);
    },
    [markets.length],
  );

  const renderItem = useCallback(
    ({ item: market, index: idx }: { item: PredictMarket; index: number }) => (
      <Box
        style={tw.style(
          { width: CARD_WIDTH, height: CARD_HEIGHT },
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
    [markets.length, tw],
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
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={tw.style(`px-[${HORIZONTAL_PADDING}px]`)}
      />
      <PaginationDots count={markets.length} activeIndex={activeIndex} />
    </Box>
  );
};

export default FeaturedCarousel;
