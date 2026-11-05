import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { ScrollView } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog; the Polymarket section uses the same id
import { WalletViewSelectorsIDs } from '../../../../../Views/Wallet/WalletView.testIds';
import ViewMoreCard from '../../../../../Views/Homepage/components/ViewMoreCard';
import { PredictEventValues } from '../../../analytics';
import {
  canPerformVenueAction,
  useVenueCapabilities,
  type PredictVenueCapabilities,
} from '../../../capabilities';
import { PredictEventCard } from '../../../events/cards';
import { useEventsWithLiveData } from '../../../hooks/useEventsWithLiveData';
import { useNextVenueId } from '../../../implementation';
import {
  createNextPredictEventRef,
  usePredictEntryActions,
  type PredictNextVenue,
} from '../../../navigation/entry';
import { usePredictOrderFlow } from '../../../views/PredictOrderFlow';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictVenueId,
} from '../../../types';
import { PredictHomeSectionTestIds } from '../../PredictHomeSection.testIds';
import {
  HomeDiscoveryFeedReads,
  type HomeDiscoveryFeedRead,
} from './HomeDiscoveryFeedReads';
import {
  HOME_DISCOVERY_SLOT_IDS,
  getHomeDiscoveryEventsPerSlot,
  resolveHomeDiscoverySlots,
  type HomeDiscoverySlotId,
} from './homeDiscoverySlots';
import {
  HomeDiscoveryHostContext,
  type HomeDiscoveryHost,
  type HomeDiscoveryState,
} from './homeDiscoveryHost';

const ENTRY_POINT = PredictEventValues.ENTRY_POINT.HOME_SECTION;
const CARD_WIDTH_CLASS = 'w-[300px]';
const SKELETON_KEYS = ['first', 'second'] as const;
const LOADING: HomeDiscoveryState = { status: 'loading' };

/**
 * What the reads amount to. Discovery waits for every shown slot before
 * painting cards, so a slower Feed never reorders the carousel. A Feed that
 * failed with Events cached keeps them; one that failed with nothing cached
 * contributes nothing.
 */
const getDiscoveryState = (
  capabilities: PredictVenueCapabilities,
  slotCount: number,
  reads: readonly HomeDiscoveryFeedRead[],
  itemCount: number,
): HomeDiscoveryState => {
  if (capabilities.status === 'loading') return LOADING;
  if (capabilities.status === 'unavailable' || slotCount === 0) {
    return { status: 'hidden', reason: 'unsupported' };
  }
  if (reads.some((read) => read.isLoading)) return LOADING;
  if (itemCount > 0) return { status: 'ready', itemCount };
  return reads.every((read) => read.isError)
    ? { status: 'hidden', reason: 'error' }
    : { status: 'hidden', reason: 'empty' };
};

const isSameState = (a: HomeDiscoveryState, b: HomeDiscoveryState) => {
  if (a.status === 'ready' && b.status === 'ready') {
    return a.itemCount === b.itemCount;
  }
  if (a.status === 'hidden' && b.status === 'hidden') {
    return a.reason === b.reason;
  }
  return a.status === b.status;
};

interface DiscoveryCarouselProps {
  venueId: PredictVenueId;
  capabilities: PredictVenueCapabilities;
  slotCount: number;
  reads: readonly HomeDiscoveryFeedRead[];
  host: HomeDiscoveryHost;
}

const DiscoveryCarousel = ({
  venueId,
  capabilities,
  slotCount,
  reads,
  host,
}: DiscoveryCarouselProps) => {
  const tw = useTailwind();
  const isFocused = useIsFocused();
  const networkTier = useNetworkTier();
  const eventsPerSlot = getHomeDiscoveryEventsPerSlot(
    getHardwareTier(),
    networkTier,
  );
  const { openPredict } = usePredictEntryActions();
  const { openOrderFlow } = usePredictOrderFlow();
  const { onStateChange, isVisible } = host;

  const events = useMemo(
    () => reads.flatMap((read) => read.events.slice(0, eventsPerSlot)),
    [reads, eventsPerSlot],
  );
  // Live prices and scores only while the section is on screen, the
  // Homepage is focused, and the device is known to be online.
  const liveEvents = useEventsWithLiveData(venueId, events, {
    isVisible: isVisible && isFocused && networkTier !== 'NONE',
    marketScope: 'card',
  });

  const state = getDiscoveryState(
    capabilities,
    slotCount,
    reads,
    liveEvents.length,
  );
  const stateRef = useRef<HomeDiscoveryState | null>(null);
  useEffect(() => {
    if (stateRef.current && isSameState(stateRef.current, state)) return;
    stateRef.current = state;
    onStateChange(state);
  }, [onStateChange, state]);

  const openHome = useCallback(() => {
    openPredict({ type: 'home', entryPoint: ENTRY_POINT });
  }, [openPredict]);

  const openEvent = useCallback(
    (event: PredictEvent) => {
      openPredict({
        type: 'event',
        // The resolver opens it only while its Venue is the Active Venue.
        eventRef: createNextPredictEventRef(
          event.venueId as PredictNextVenue,
          event.id,
        ),
        entryPoint: ENTRY_POINT,
        titleSnapshot: event.title,
        imageSnapshot: event.imageUrl,
      });
    },
    [openPredict],
  );

  const openOrder = useCallback(
    (event: PredictEvent, market: PredictMarket, outcome: PredictOutcome) => {
      openOrderFlow({
        action: 'buy',
        eventId: event.id,
        venueId: event.venueId,
        marketId: market.id,
        side: outcome.side,
        outcomeLabel: outcome.label,
        eventTitle: event.title,
        eventImageUrl: event.imageUrl,
        askPrice: outcome.askPrice,
      });
    },
    [openOrderFlow],
  );
  const onOrder = canPerformVenueAction(capabilities, 'buy')
    ? openOrder
    : undefined;

  if (state.status === 'hidden') {
    return null;
  }

  return (
    <Box paddingBottom={3} testID={PredictHomeSectionTestIds.DISCOVERY}>
      <SectionDivider />
      <SectionHeader
        title={strings('homepage.sections.predictions')}
        isInteractive
        onPress={openHome}
        testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('predictions')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-3')}
      >
        {state.status === 'loading' ? (
          SKELETON_KEYS.map((key) => (
            <Box
              key={key}
              twClassName={`${CARD_WIDTH_CLASS} h-[180px] rounded-2xl bg-muted`}
              testID={PredictHomeSectionTestIds.DISCOVERY_CARD_SKELETON}
            />
          ))
        ) : (
          <>
            {liveEvents.map((event) => (
              <Box key={event.id} twClassName={CARD_WIDTH_CLASS}>
                <PredictEventCard
                  event={event}
                  onPress={() => openEvent(event)}
                  onOrder={onOrder}
                />
              </Box>
            ))}
            <ViewMoreCard
              onPress={openHome}
              twClassName="w-[180px] flex-1"
              testID={PredictHomeSectionTestIds.DISCOVERY_VIEW_MORE}
            />
          </>
        )}
      </ScrollView>
    </Box>
  );
};

interface DiscoveryProps {
  host: HomeDiscoveryHost;
  slotIds: readonly HomeDiscoverySlotId[];
}

const Discovery = ({ host, slotIds }: DiscoveryProps) => {
  const venueId = useNextVenueId();
  const capabilities = useVenueCapabilities(venueId);
  const slotFeeds = useMemo(
    () => resolveHomeDiscoverySlots(capabilities, slotIds),
    [capabilities, slotIds],
  );

  return (
    <HomeDiscoveryFeedReads venueId={venueId} slotFeeds={slotFeeds}>
      {(reads) => (
        <DiscoveryCarousel
          venueId={venueId}
          capabilities={capabilities}
          slotCount={slotFeeds.length}
          reads={reads}
          host={host}
        />
      )}
    </HomeDiscoveryFeedReads>
  );
};

export interface NextHomeDiscoveryProps {
  /**
   * The slots to show, when a UI Slots assignment names them. Defaults to
   * every slot; either way only the ones the Venue supports render.
   */
  slotIds?: readonly HomeDiscoverySlotId[];
}

/**
 * Predictions discovery for a next Venue: the Polymarket section's trending
 * carousel layout (header, horizontal cards, View more), filled with the
 * Events of each Homepage slot the Venue's descriptor supports. Card presses
 * open the Event through a Predict intent; outcome presses open the Order
 * flow for the Event's Venue. Renders nothing outside a Homepage section.
 */
export const NextHomeDiscovery = ({
  slotIds = HOME_DISCOVERY_SLOT_IDS,
}: NextHomeDiscoveryProps) => {
  const host = useContext(HomeDiscoveryHostContext);
  return host ? <Discovery host={host} slotIds={slotIds} /> : null;
};
