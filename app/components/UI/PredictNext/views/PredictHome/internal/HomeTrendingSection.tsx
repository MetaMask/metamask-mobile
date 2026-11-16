import React, { useCallback, useMemo } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Box,
  SectionHeader,
  Skeleton,
} from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import { strings } from '../../../../../../../locales/i18n';
import { PredictEventCard } from '../../../events/cards';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import { PredictHomeTestIds } from '../PredictHome.testIds';
import { Carousel, type CarouselPagination } from './Carousel';
import { CarouselPaginationDots } from './CarouselPaginationDots';

// The design's card row: 340x220pt cards, 8pt apart.
const CARD_WIDTH = 340;
const CARD_HEIGHT = 220;
const CARD_GAP = 8;

interface HomeTrendingSectionProps {
  events: readonly PredictEvent[];
  isLoading: boolean;
  /** Opens the Trending screen. Without it the header is a plain title. */
  onOpen?: () => void;
  onOpenEvent: (event: PredictEvent) => void;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
  /** Reports the section's frame within the scroll content. */
  onLayout?: (event: LayoutChangeEvent) => void;
}

const TrendingCardSkeleton = () => (
  <Skeleton
    width={CARD_WIDTH}
    height={CARD_HEIGHT}
    twClassName="rounded-2xl"
    testID={PredictHomeTestIds.HOME_TRENDING_SKELETON}
  />
);

/**
 * Home's Trending row: a "Trending" header that opens the Trending screen
 * when there is one, then a snap carousel of featured Event cards with
 * pagination dots under it. The row spans the screen edge to edge, so the
 * first card starts 16pt in and the next one peeks; the header keeps its own
 * 16pt padding. Skeleton cards stand in while loading, and nothing renders
 * once loaded without an Event.
 */
export const HomeTrendingSection = ({
  events,
  isLoading,
  onOpen,
  onOpenEvent,
  onOrder,
  onLayout,
}: HomeTrendingSectionProps) => {
  // The carousel takes a mutable array.
  const data = useMemo(() => [...events], [events]);
  const renderItem = useCallback<ListRenderItem<PredictEvent>>(
    ({ item }) => (
      <PredictEventCard
        event={item}
        variant="featured"
        onPress={() => onOpenEvent(item)}
        onOrder={onOrder}
      />
    ),
    [onOpenEvent, onOrder],
  );
  // The dots sit 8pt below the cards. Skeletons get none, and a single
  // card needs none.
  const renderFooter = useCallback(
    ({ activePage, totalPages }: CarouselPagination) =>
      isLoading || totalPages <= 1 ? null : (
        <Box twClassName="pt-2">
          <CarouselPaginationDots
            totalPages={totalPages}
            activePage={activePage}
            testID={PredictHomeTestIds.HOME_TRENDING_PAGINATION}
          />
        </Box>
      ),
    [isLoading],
  );

  if (!isLoading && events.length === 0) {
    return null;
  }

  return (
    <Box
      testID={PredictHomeTestIds.HOME_TRENDING}
      twClassName="-mx-4 gap-4"
      onLayout={onLayout}
    >
      <SectionHeader
        testID={PredictHomeTestIds.HOME_TRENDING_HEADER}
        title={strings('predict_next.home_feed.trending')}
        twClassName="py-0"
        {...(onOpen
          ? {
              isInteractive: true,
              onPress: onOpen,
              endIconProps: {
                testID: PredictHomeTestIds.HOME_TRENDING_CHEVRON,
              },
            }
          : {})}
      />
      <Carousel<PredictEvent>
        data={data}
        isLoading={isLoading}
        renderItem={renderItem}
        Skeleton={TrendingCardSkeleton}
        idPrefix={PredictHomeTestIds.HOME_TRENDING}
        cardWidth={CARD_WIDTH}
        gap={CARD_GAP}
        renderFooter={renderFooter}
        testID={PredictHomeTestIds.HOME_TRENDING_CAROUSEL}
      />
    </Box>
  );
};
