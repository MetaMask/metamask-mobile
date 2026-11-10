import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, type ViewabilityConfig } from 'react-native';
import { Box, BoxBorderColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  FlashList,
  FlashListRef,
  ListRenderItem,
  ViewToken,
} from '@shopify/flash-list';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
/** Default card slot: 80% of the screen width, gap included. */
const DEFAULT_SLOT_WIDTH = SCREEN_WIDTH * 0.8;
/** Default space between cards, the `pr-3` the carousel always had. */
const DEFAULT_GAP = 12;
const CARD_HEIGHT = 220;
const SKELETON_PLACEHOLDER_COUNT = 3;
/** A card is the active page once at least half of it is on screen. */
const DEFAULT_VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

export interface HorizontalCarouselPagination {
  /** Index of the card the carousel is showing, from 0. */
  activePage: number;
  /** One page per card (or skeleton, while loading). */
  totalPages: number;
}

export interface HorizontalCarouselProps<T> {
  data: T[];
  isLoading: boolean;
  renderItem: ListRenderItem<T>;
  Skeleton: React.ComponentType;
  /** Stable id for the keyExtractor namespace. */
  idPrefix: string;
  /** @default 3 */
  skeletonCount?: number;
  /**
   * Width of each card, in points. The carousel snaps one card plus `gap`
   * at a time. When omitted, each card slot is 80% of the screen width with
   * `gap` taken out of it, and the last card fills its whole slot (the
   * Explore layout).
   */
  cardWidth?: number;
  /**
   * Space between cards, in points.
   * @default 12
   */
  gap?: number;
  /**
   * Renders below the list, with the carousel's current page. This is
   * where pagination dots go.
   */
  renderFooter?: (pagination: HorizontalCarouselPagination) => React.ReactNode;
  /**
   * When a card counts as the active page.
   * @default { itemVisiblePercentThreshold: 50 }
   */
  viewabilityConfig?: ViewabilityConfig;
  testID?: string;
}

/**
 * Horizontally-scrolling carousel of full-width cards used for predictions
 * and any "feature card" feed. By default each card is `~80%` of the screen
 * width; `cardWidth` and `gap` size it explicitly.
 */
function HorizontalCarousel<T>({
  data,
  isLoading,
  renderItem,
  Skeleton,
  idPrefix,
  skeletonCount = SKELETON_PLACEHOLDER_COUNT,
  cardWidth,
  gap = DEFAULT_GAP,
  renderFooter,
  viewabilityConfig = DEFAULT_VIEWABILITY_CONFIG,
  testID,
}: HorizontalCarouselProps<T>) {
  const tw = useTailwind();
  const flashListRef = useRef<FlashListRef<T | undefined>>(null);
  const [visiblePage, setVisiblePage] = useState(0);

  const skeletonData = useMemo(
    () => Array.from<T | undefined>({ length: skeletonCount }),
    [skeletonCount],
  );
  const displayData = isLoading ? skeletonData : data;

  // A slot is one card and the gap after it; the last card has no gap.
  const slotWidth =
    cardWidth === undefined ? DEFAULT_SLOT_WIDTH : cardWidth + gap;
  const lastSlotWidth = cardWidth ?? DEFAULT_SLOT_WIDTH;

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<T | undefined>[] }) => {
      const indices = viewableItems
        .filter((token) => token.isViewable && token.index !== null)
        .map((token) => token.index as number);
      if (indices.length > 0) setVisiblePage(Math.min(...indices));
    },
    [],
  );

  const totalPages = displayData.length;
  const activePage = Math.max(0, Math.min(visiblePage, totalPages - 1));

  const list = (
    <FlashList
      ref={flashListRef}
      data={displayData}
      renderItem={({ item, index }) => {
        const isLastItem = index === displayData.length - 1;
        return (
          <Box
            borderColor={BoxBorderColor.BorderDefault}
            style={tw.style({
              width: isLastItem ? lastSlotWidth : slotWidth,
              minHeight: CARD_HEIGHT,
              ...(isLastItem ? {} : { paddingRight: gap }),
            })}
            twClassName="rounded-2xl overflow-hidden"
            testID={`${idPrefix}-card-${index}`}
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
      snapToInterval={slotWidth}
      decelerationRate="fast"
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={handleViewableItemsChanged}
      testID={testID ?? `${idPrefix}-flash-list`}
    />
  );

  if (!renderFooter) return list;

  return (
    <Box>
      {list}
      {renderFooter({ activePage, totalPages })}
    </Box>
  );
}

export default HorizontalCarousel;
