import React, { useCallback, useMemo } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import HorizontalCarousel from '../../../../../Views/TrendingView/components/HorizontalCarousel';
import SectionHeader from '../../../../../Views/TrendingView/components/SectionHeader';
import { useExploreActiveTab } from '../../../../../Views/TrendingView/ExploreActiveTabContext';
import {
  trackExploreInteracted,
  type ExploreSectionName,
  type ExploreTabName,
} from '../../../../../Views/TrendingView/search/analytics';
import PredictionsSkeleton from '../../../../Predict/trending/PredictionsSkeleton';
import { useEventsWithLiveData } from '../../../hooks/useEventsWithLiveData';
import type { PredictEvent } from '../../../types';
import { PredictOrderFlowProvider } from '../../../views/PredictOrderFlow';
import { NextTrendingEventCard } from './NextTrendingEventCard';
import { NO_VENUE } from './useNextTrendingFeed';
import { useTrendingLiveDataAllowed } from './useTrendingLiveDataAllowed';

/** The Polymarket carousel shows six cards; so does this one. */
const CAROUSEL_MAX_ITEMS = 6;

export interface NextTrendingCarouselProps {
  events: readonly PredictEvent[];
  isLoading: boolean;
  tabName: ExploreTabName;
  sectionName: ExploreSectionName;
  title: string;
  testIdPrefix: string;
  idPrefix: string;
  onViewAll: () => void;
  isEnabled: boolean;
}

/**
 * A next Venue's Explore Predictions carousel, laid out as the Polymarket
 * one (`PredictionsCarouselSection`): the section header with View all, up
 * to six cards in the same horizontal carousel and skeleton, and the same
 * Explore analytics on card and buy taps. It watches live data once for the
 * cards it shows (one listener per topic, one watch for every Event), and
 * only while the Explore tab showing them is the active, focused one and
 * the device allows live data. It owns the Order Flow its buy buttons open.
 */
export const NextTrendingCarousel = ({
  events,
  isLoading,
  tabName,
  sectionName,
  title,
  testIdPrefix,
  idPrefix,
  onViewAll,
  isEnabled,
}: NextTrendingCarouselProps) => {
  const isFocused = useIsFocused();
  const isTabActive = useExploreActiveTab() === tabName;
  const isLiveAllowed = useTrendingLiveDataAllowed();
  const isLive = isFocused && isTabActive && isLiveAllowed;

  const shownEvents = useMemo(
    () => events.slice(0, CAROUSEL_MAX_ITEMS),
    [events],
  );
  // One Feed read, so one Venue for every Event it shows.
  const liveEvents = useEventsWithLiveData(
    shownEvents[0]?.venueId ?? NO_VENUE,
    shownEvents,
    { isVisible: isLive, marketScope: 'card' },
  );
  // The carousel takes a mutable array; the hook keeps its result's identity.
  const carouselEvents = useMemo(() => [...liveEvents], [liveEvents]);

  const renderItem: ListRenderItem<PredictEvent> = useCallback(
    ({ item, index }) => (
      <NextTrendingEventCard
        event={item}
        isCarousel
        testID={`${testIdPrefix}-${item.id}`}
        onCardPress={() =>
          trackExploreInteracted({
            interaction_type: 'section_item_tapped',
            tab_name: tabName,
            section_name: sectionName,
            asset_type: 'prediction',
            position: index,
            item_clicked: item.id,
          })
        }
        onBuyButtonPress={() =>
          trackExploreInteracted({
            interaction_type: 'prediction_voted',
            tab_name: tabName,
            section_name: sectionName,
            item_clicked: item.id,
          })
        }
      />
    ),
    [sectionName, tabName, testIdPrefix],
  );

  if (!isEnabled || (!isLoading && events.length === 0)) return null;

  return (
    <PredictOrderFlowProvider>
      <Box>
        <SectionHeader
          title={title}
          onViewAll={onViewAll}
          testID={`section-header-view-all-${idPrefix}`}
          tabName={tabName}
          sectionName={sectionName}
        />
        <HorizontalCarousel<PredictEvent>
          data={carouselEvents}
          isLoading={isLoading}
          renderItem={renderItem}
          Skeleton={PredictionsSkeleton}
          idPrefix={idPrefix}
        />
      </Box>
    </PredictOrderFlowProvider>
  );
};
