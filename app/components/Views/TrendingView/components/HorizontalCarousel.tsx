import React, { useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { Box, BoxBorderColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { FlashList, FlashListRef, ListRenderItem } from '@shopify/flash-list';

const CARD_WIDTH_RATIO = 0.8;
const CARD_HEIGHT = 220;
const SKELETON_PLACEHOLDER_COUNT = 3;

export interface HorizontalCarouselProps<T> {
  data: T[];
  isLoading: boolean;
  renderItem: ListRenderItem<T>;
  Skeleton: React.ComponentType;
  /** Stable id for the keyExtractor namespace. */
  idPrefix: string;
  /** @default 3 */
  skeletonCount?: number;
  testID?: string;
}

/**
 * Horizontally-scrolling carousel of full-width cards used for predictions
 * and any "feature card" feed. Each card is `~80%` of the screen width.
 */
function HorizontalCarousel<T>({
  data,
  isLoading,
  renderItem,
  Skeleton,
  idPrefix,
  skeletonCount = SKELETON_PLACEHOLDER_COUNT,
  testID,
}: HorizontalCarouselProps<T>) {
  const tw = useTailwind();
  const flashListRef = useRef<FlashListRef<T | undefined>>(null);
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * CARD_WIDTH_RATIO;

  const skeletonData = useMemo(
    () => Array.from<T | undefined>({ length: skeletonCount }),
    [skeletonCount],
  );
  const displayData = isLoading ? skeletonData : data;

  return (
    <FlashList
      ref={flashListRef}
      data={displayData}
      renderItem={({ item, index }) => {
        const isLastItem = index === displayData.length - 1;
        return (
          <Box
            borderColor={BoxBorderColor.BorderDefault}
            style={tw.style({ width: cardWidth, minHeight: CARD_HEIGHT })}
            twClassName={`rounded-2xl overflow-hidden ${
              !isLastItem ? 'pr-3' : ''
            }`}
          >
            {isLoading ? (
              <Skeleton />
            ) : (
              renderItem({
                item: item as T,
                index,
                target: 'Cell',
              })
            )}
          </Box>
        );
      }}
      contentContainerStyle={tw.style('px-4')}
      keyExtractor={
        isLoading
          ? (_, index) => `${idPrefix}-skeleton-${index}`
          : (_, index) => `${idPrefix}-${index}`
      }
      horizontal
      pagingEnabled={false}
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth}
      decelerationRate="fast"
      testID={testID ?? `${idPrefix}-flash-list`}
    />
  );
}

export default HorizontalCarousel;
