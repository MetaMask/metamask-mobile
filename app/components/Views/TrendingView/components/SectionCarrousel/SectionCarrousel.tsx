import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  BoxBorderColor,
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
import { SectionId, SECTIONS_CONFIG } from '../../config/sections.config';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH;
const CARD_WIDTH = CONTENT_WIDTH * 0.8;
const CARD_HEIGHT = 220;

interface SectionCarrouselStylesVars {
  activeIndex: number;
}

const styleSheet = (params: {
  theme: Theme;
  vars: SectionCarrouselStylesVars;
}) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    carouselItemContainer: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    },
    carouselItem: {
      borderRadius: 16,
      paddingHorizontal: 8,
      overflow: 'hidden',
      shadowColor: colors.shadow.default,
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

export interface SectionCarrouselProps {
  sectionId: SectionId;
}

const SectionCarrousel: React.FC<SectionCarrouselProps> = ({ sectionId }) => {
  const navigation = useNavigation();
  const [activeIndex, setActiveIndex] = useState(0);
  const flashListRef = useRef<FlashListRef<unknown>>(null);

  const section = SECTIONS_CONFIG[sectionId];
  const { data, isLoading } = section.useSectionData();

  const { styles } = useStyles(styleSheet, {
    activeIndex,
  });

  const skeletonCount = 3;
  const skeletonData = Array.from({ length: skeletonCount });

  const displayDataLength = isLoading ? skeletonCount : data.length;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollPosition = event.nativeEvent.contentOffset.x;
      const index = Math.round(scrollPosition / CARD_WIDTH);
      setActiveIndex(Math.min(index, displayDataLength - 1));
    },
    [displayDataLength],
  );

  const scrollToIndex = useCallback((index: number) => {
    flashListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setActiveIndex(index);
  }, []);

  const renderSkeletonItem = useCallback(
    () => (
      <Box style={styles.carouselItemContainer}>
        <Box
          borderColor={BoxBorderColor.BorderDefault}
          style={styles.carouselItem}
        >
          <section.Skeleton />
        </Box>
      </Box>
    ),
    [styles, section],
  );

  const renderDataItem = useCallback(
    ({ item }: { item: unknown }) => (
      <Box style={styles.carouselItemContainer}>
        <Box
          borderColor={BoxBorderColor.BorderDefault}
          style={styles.carouselItem}
        >
          <section.RowItem item={item} navigation={navigation} />
        </Box>
      </Box>
    ),
    [styles, section, navigation],
  );

  const renderPaginationDots = useCallback(
    () => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        style={styles.paginationContainer}
      >
        {Array.from({ length: displayDataLength }).map((_, index) => {
          const isActive = activeIndex === index;
          return (
            <Pressable
              key={`dot-${index}`}
              onPress={() => scrollToIndex(index)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID={`${sectionId}-pagination-dot-${index}`}
            >
              <Box style={isActive ? styles.dotActive : styles.dot} />
            </Pressable>
          );
        })}
      </Box>
    ),
    [displayDataLength, activeIndex, scrollToIndex, styles, sectionId],
  );

  return (
    <Box twClassName="mb-6">
      <Box>
        {isLoading && (
          <FlashList
            ref={flashListRef}
            data={skeletonData}
            renderItem={renderSkeletonItem}
            keyExtractor={(_, index) => `skeleton-${index}`}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH}
            decelerationRate="fast"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            testID={`${sectionId}-flash-list`}
          />
        )}
        {!isLoading && (
          <FlashList
            ref={flashListRef}
            data={data}
            renderItem={renderDataItem}
            keyExtractor={(item) => section.keyExtractor(item)}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH}
            decelerationRate="fast"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            testID={`${sectionId}-flash-list`}
          />
        )}
      </Box>

      <Box twClassName="px-1">{renderPaginationDots()}</Box>
    </Box>
  );
};

export default SectionCarrousel;
