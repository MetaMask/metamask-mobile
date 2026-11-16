import React, { useCallback, useMemo, useState } from 'react';
import type { ViewabilityConfig } from 'react-native';
import { Box, BoxBorderColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { FlashList, ListRenderItem, ViewToken } from '@shopify/flash-list';

/** Default space between cards. */
const DEFAULT_GAP = 12;
const CARD_HEIGHT = 220;
const SKELETON_PLACEHOLDER_COUNT = 3;
/** A card is the active page once at least half of it is on screen. */
const DEFAULT_VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

export interface CarouselPagination {
  /** Index of the card the carousel is showing, from 0. */
  activePage: number;
  /** One page per card (or skeleton, while loading). */
  totalPages: number;
}

export interface CarouselProps<T> {
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
   * at a time.
   */
  cardWidth: number;
  /**
   * Space between cards, in points.
   * @default 12
   */
  gap?: number;
  /**
   * Renders below the list, with the carousel's current page. This is
   * where pagination dots go.
   */
  renderFooter?: (pagination: CarouselPagination) => React.ReactNode;
  /**
   * When a card counts as the active page.
   * @default { itemVisiblePercentThreshold: 50 }
   */
  viewabilityConfig?: ViewabilityConfig;
  testID?: string;
}

/**
 * Horizontal snap carousel of cards for Predict Home. It is card-agnostic:
 * `renderItem` draws each card and `Skeleton` stands in while loading. The
 * caller sizes the cards with `cardWidth`; `gap` spaces them. The active page
 * comes from the list's viewability, and `renderFooter` receives it (for
 * pagination dots).
 */
export function Carousel<T>({
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
}: CarouselProps<T>) {
  const tw = useTailwind();
  const [visiblePage, setVisiblePage] = useState(0);

  const skeletonData = useMemo(
    () => Array.from<T | undefined>({ length: skeletonCount }),
    [skeletonCount],
  );
  const displayData = isLoading ? skeletonData : data;

  // A slot is one card and the gap after it; the last card has no gap.
  const slotWidth = cardWidth + gap;

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
      data={displayData}
      renderItem={({ item, index }) => {
        const isLastItem = index === displayData.length - 1;
        return (
          <Box
            borderColor={BoxBorderColor.BorderDefault}
            style={tw.style({
              width: isLastItem ? cardWidth : slotWidth,
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
