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
  StyleSheet,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { useStyles } from '../../../../../component-library/hooks';
import { Theme } from '../../../../../util/theme/models';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const CARD_SPACING = 16;
const ACTUAL_CARD_WIDTH = CARD_WIDTH * 0.8; // Actual rendered card width (80% to show peek of next card)
const SNAP_INTERVAL = ACTUAL_CARD_WIDTH + CARD_SPACING;

interface SectionCarrouselStylesVars {
  activeIndex: number;
  cardWidth: number;
}

const styleSheet = (params: {
  theme: Theme;
  vars: SectionCarrouselStylesVars;
}) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    carouselItem: {
      width: params.vars.cardWidth * 0.8,
      borderRadius: 16,
      paddingHorizontal: 8,
      overflow: 'hidden',
      borderColor: colors.border.default,
      shadowColor: colors.shadow.default,
    },
    carouselItemLast: {
      width: params.vars.cardWidth,
      borderRadius: 16,
      paddingHorizontal: 8,
      overflow: 'hidden',
      borderColor: colors.border.default,
      shadowColor: colors.shadow.default,
    },
    carouselContentContainer: {
      paddingRight: 16,
    },
    paginationContainer: {
      marginTop: 16,
      gap: 8,
    },
    dot: {
      height: 8,
      width: 8,
      borderRadius: 4,
      backgroundColor: colors.border.muted,
    },
    dotActive: {
      height: 8,
      width: 24,
      borderRadius: 4,
      backgroundColor: colors.text.default,
    },
  });
};

export interface SectionCarrouselProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  keyExtractor: (item: T) => string;
  showPagination?: boolean;
  testIDPrefix?: string;
}

const SectionCarrousel = <T,>({
  data,
  renderItem,
  keyExtractor,
  showPagination = true,
  testIDPrefix = 'carousel',
}: SectionCarrouselProps<T>) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flashListRef = useRef<FlashListRef<T>>(null);

  const { styles } = useStyles(styleSheet, {
    activeIndex,
    cardWidth: CARD_WIDTH,
  });

  const dataLength = data.length;

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
    ({ item, index }: { item: T; index: number }) => {
      const isLast = index === dataLength - 1;

      return (
        <Box
          style={isLast ? styles.carouselItemLast : styles.carouselItem}
          twClassName="mr-4"
        >
          {renderItem(item, index)}
        </Box>
      );
    },
    [styles, dataLength, renderItem],
  );

  const renderPaginationDots = useCallback(
    () => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        style={styles.paginationContainer}
      >
        {Array.from({ length: dataLength }).map((_, index) => {
          const isActive = activeIndex === index;
          return (
            <Pressable
              key={`dot-${index}`}
              onPress={() => scrollToIndex(index)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID={`${testIDPrefix}-pagination-dot-${index}`}
            >
              <Box style={isActive ? styles.dotActive : styles.dot} />
            </Pressable>
          );
        })}
      </Box>
    ),
    [dataLength, activeIndex, scrollToIndex, styles, testIDPrefix],
  );

  return (
    <>
      <Box>
        <FlashList
          ref={flashListRef}
          data={data}
          renderItem={renderCarouselItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={SNAP_INTERVAL}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.carouselContentContainer}
          testID={`${testIDPrefix}-flash-list`}
        />
      </Box>

      {showPagination && <Box twClassName="px-1">{renderPaginationDots()}</Box>}
    </>
  );
};

export default SectionCarrousel;
