import React from 'react';
import { ScrollView, type LayoutChangeEvent } from 'react-native';
import {
  Box,
  SectionHeader,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { PredictEventCard } from '../../../events/cards';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import { PredictHomeTestIds } from '../PredictHome.testIds';

// The small game card is a 190x134pt tile.
const CARD_WIDTH = 190;
const CARD_HEIGHT = 134;
const SKELETON_COUNT = 3;

interface HomeSportsSectionProps {
  /** Game Events; each renders as a small game card. */
  events: readonly PredictEvent[];
  isLoading: boolean;
  /** Opens the Feed Screen behind the row. */
  onOpen: () => void;
  onOpenEvent: (event: PredictEvent) => void;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
  /** Reports the section's frame within the scroll content. */
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Home's Sports row: a "Sports" header with a chevron, then a free-scrolling
 * row of small game cards 12pt apart, with no snapping and no pagination. The
 * row spans the screen edge to edge, so the first card starts 16pt in; the
 * header keeps its own 16pt padding. Skeleton cards of the same size stand in
 * while loading, and nothing renders once loaded without an Event.
 */
export const HomeSportsSection = ({
  events,
  isLoading,
  onOpen,
  onOpenEvent,
  onOrder,
  onLayout,
}: HomeSportsSectionProps) => {
  const tw = useTailwind();

  if (!isLoading && events.length === 0) {
    return null;
  }

  return (
    <Box
      testID={PredictHomeTestIds.HOME_SPORTS}
      twClassName="-mx-4 gap-4"
      onLayout={onLayout}
    >
      <SectionHeader
        testID={PredictHomeTestIds.HOME_SPORTS_HEADER}
        title={strings('predict_next.home_feed.sports')}
        isInteractive
        onPress={onOpen}
        endIconProps={{ testID: PredictHomeTestIds.HOME_SPORTS_CHEVRON }}
        twClassName="py-0"
      />
      <ScrollView
        testID={PredictHomeTestIds.HOME_SPORTS_ROW}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-3')}
      >
        {isLoading
          ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <Skeleton
                key={index}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                twClassName="rounded-2xl"
                testID={PredictHomeTestIds.HOME_SPORTS_SKELETON}
              />
            ))
          : events.map((event) => (
              <PredictEventCard
                key={event.id}
                event={event}
                variant="small"
                onPress={() => onOpenEvent(event)}
                onOrder={onOrder}
              />
            ))}
      </ScrollView>
    </Box>
  );
};
