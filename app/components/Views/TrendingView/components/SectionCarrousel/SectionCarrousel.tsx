import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { SectionId, SECTIONS_CONFIG } from '../../config/sections.config';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const CARD_SPACING = 16;
const ACTUAL_CARD_WIDTH = CARD_WIDTH * 0.8; // Actual rendered card width (80% to show peek of next card)
const SNAP_INTERVAL = ACTUAL_CARD_WIDTH + CARD_SPACING;

export interface SectionCarrouselProps {
  sectionId: SectionId;
}

const SectionCarrousel: React.FC<SectionCarrouselProps> = ({ sectionId }) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const [activeIndex, setActiveIndex] = useState(0);
  const flashListRef = useRef<FlashListRef<unknown>>(null);

  const section = SECTIONS_CONFIG[sectionId];
  const { data, isLoading } = section.useSectionData();

  const skeletonCount = 3;
  const skeletonData = Array.from({ length: skeletonCount });

  const displayData = isLoading ? skeletonData : data;
  const displayDataLength = displayData.length;

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

  const renderItem = useCallback(
    ({ item, index }: { item: unknown; index: number }) => {
      const isLast = index === displayDataLength - 1;
      const cardWidthStyle = { width: isLast ? CARD_WIDTH : CARD_WIDTH * 0.8 };

      return (
        <Box
          style={cardWidthStyle}
          twClassName="mr-4 rounded-2xl px-2 overflow-hidden"
        >
          {isLoading ? (
            <section.Skeleton />
          ) : (
            <section.RowItem item={item} navigation={navigation} />
          )}
        </Box>
      );
    },
    [displayDataLength, isLoading, section, navigation],
  );

  const renderPaginationDots = useCallback(
    () => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="mt-4 gap-2"
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
              <Box
                twClassName={
                  isActive
                    ? 'h-2 w-6 rounded bg-text-default'
                    : 'h-2 w-2 rounded bg-border-muted'
                }
              />
            </Pressable>
          );
        })}
      </Box>
    ),
    [displayDataLength, activeIndex, scrollToIndex, sectionId],
  );

  return (
    <Box twClassName="mb-6">
      <FlashList
        ref={flashListRef}
        data={displayData}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          isLoading ? `skeleton-${index}` : section.keyExtractor(item)
        }
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={tw.style('pr-4')}
        testID={`${sectionId}-flash-list`}
      />

      <Box twClassName="px-1">{renderPaginationDots()}</Box>
    </Box>
  );
};

export default SectionCarrousel;
