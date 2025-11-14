import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { usePredictMarketData } from '../../../UI/Predict/hooks/usePredictMarketData';
import PredictMarket from '../../../UI/Predict/components/PredictMarket';
import { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import { PredictEventValues } from '../../../UI/Predict/constants/eventNames';
import PredictMarketSkeleton from '../../../UI/Predict/components/PredictMarketSkeleton';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './PredictionSection.styles';
import SectionHeader from '../components/SectionHeader/SectionHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const CARD_SPACING = 16;
const ACTUAL_CARD_WIDTH = CARD_WIDTH * 0.8; // Actual rendered card width (80% to show peek of next card)
const SNAP_INTERVAL = ACTUAL_CARD_WIDTH + CARD_SPACING;

const PredictionSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flashListRef = useRef<FlashListRef<PredictMarketType>>(null);

  const { styles } = useStyles(styleSheet, {
    activeIndex,
    cardWidth: CARD_WIDTH,
  });

  // Fetch prediction market data with limit of 6
  const { marketData, isFetching } = usePredictMarketData({
    category: 'trending',
    pageSize: 6,
  });

  const marketDataLength = marketData?.length ?? 0;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollPosition = event.nativeEvent.contentOffset.x;
      const index = Math.round(scrollPosition / SNAP_INTERVAL);
      setActiveIndex(index);
    },
    [],
  );

  const scrollToIndex = useCallback((index: number) => {
    flashListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setActiveIndex(index);
  }, []);

  const renderCarouselItem = useCallback(
    ({ item, index }: { item: PredictMarketType; index: number }) => {
      const isLast = index === marketDataLength - 1;

      return (
        <Box
          style={isLast ? styles.carouselItemLast : styles.carouselItem}
          twClassName="mr-4"
        >
          <PredictMarket
            market={item}
            entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
            testID={`prediction-carousel-card-${index + 1}`}
          />
        </Box>
      );
    },
    [styles, marketDataLength],
  );

  const renderPaginationDots = useCallback(
    () => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        style={styles.paginationContainer}
      >
        {Array.from({ length: marketDataLength }).map((_, index) => {
          const isActive = activeIndex === index;
          return (
            <Pressable
              key={`dot-${index}`}
              onPress={() => scrollToIndex(index)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Box style={isActive ? styles.dotActive : styles.dot} />
            </Pressable>
          );
        })}
      </Box>
    ),
    [marketDataLength, activeIndex, scrollToIndex, styles],
  );

  // Show loading state while fetching
  if (isFetching) {
    return (
      <Box twClassName="mb-6">
        <SectionHeader sectionId="predictions" />
        <Box>
          <FlashList
            data={[1, 2, 3]}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ index }) => {
              const isLast = index === 2; // 3 items (0, 1, 2)

              return (
                <Box
                  style={isLast ? styles.carouselItemLast : styles.carouselItem}
                  twClassName="mr-4"
                >
                  <PredictMarketSkeleton testID="prediction-carousel-skeleton" />
                </Box>
              );
            }}
            keyExtractor={(item) => `skeleton-${item}`}
            contentContainerStyle={styles.carouselContentContainer}
          />
        </Box>
        <Box twClassName="px-1">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            style={styles.paginationContainer}
          >
            {[0, 1, 2].map((index) => (
              <Box key={`skeleton-dot-${index}`} style={styles.dot} />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  // Show empty state when no data
  if (marketDataLength === 0) {
    return null; // Don't show the section if there are no predictions
  }

  return (
    <Box twClassName="mb-6">
      <SectionHeader sectionId="predictions" />

      <Box>
        <FlashList
          ref={flashListRef}
          data={marketData ?? []}
          renderItem={renderCarouselItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={SNAP_INTERVAL}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.carouselContentContainer}
        />
      </Box>

      <Box twClassName="px-1">{renderPaginationDots()}</Box>
    </Box>
  );
};

export default PredictionSection;
