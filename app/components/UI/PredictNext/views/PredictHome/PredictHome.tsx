import React, { useCallback, useMemo } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Box,
  HeaderStandardAnimated,
  IconName,
  Text,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import Reanimated from 'react-native-reanimated';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { useEventsWithLiveData } from '../../hooks/useEventsWithLiveData';
import { useBalance } from '../../hooks/useBalance';
import {
  FEED_SCREENS,
  type FeedScreenDefinition,
  type FeedScreenId,
} from '../../navigation/feedScreens';
import {
  PREDICT_SURFACE_FEED_KEYS,
  canPerformVenueAction,
  isVenueSearchSupported,
  resolveSurfaceFeeds,
  useVenueCapabilities,
  type PredictVenueCapabilities,
} from '../../capabilities';
import { useNextVenueId } from '../../implementation';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import { usePredictOrderFlow } from '../PredictOrderFlow';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictVenueId,
} from '../../types';
import { TraceName } from '../../../../../util/trace';
import { BalanceSummary } from './internal/BalanceSummary';
import { FeedPreviewSection } from './internal/FeedPreviewSection';
import {
  HOME_SECTION_IDS,
  HomeFeedReads,
  type HomeFeedRead,
} from './internal/HomeFeedReads';
import { HomeSectionsStatus } from './internal/HomeSectionsStatus';
import { PortfolioActions } from './internal/PortfolioActions';
import { useVisibleSections } from './internal/useVisibleSections';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { strings } from '../../../../../../locales/i18n';

const sectionTitle = (sectionId: FeedScreenId) => {
  const feedScreen: FeedScreenDefinition = FEED_SCREENS[sectionId];
  return feedScreen.selectionLabel ?? feedScreen.title;
};

interface PredictHomeViewProps {
  venueId: PredictVenueId;
  capabilities: PredictVenueCapabilities;
  /** How many sections the Venue supports. */
  sectionCount: number;
  /** One read per Home section, supported or not, in display order. */
  reads: readonly HomeFeedRead[];
}

const PredictHomeView = ({
  venueId,
  capabilities,
  sectionCount,
  reads,
}: PredictHomeViewProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const isFocused = useIsFocused();
  const { scrollY, titleSectionHeightSv, setTitleSectionHeight, onScroll } =
    useHeaderStandardAnimated();
  const {
    visibleKeys,
    onViewportLayout,
    onContentLayout,
    onSectionLayout,
    onScrollSettled,
  } = useVisibleSections({ keys: HOME_SECTION_IDS, scrollY });
  const balanceQuery = useBalance(venueId);
  const canBuy = canPerformVenueAction(capabilities, 'buy');
  const feedEvents = useMemo(
    () => reads.flatMap((read) => read.events),
    [reads],
  );
  // Section-level visibility: every Event of a section that overlaps the
  // viewport is watched; a section scrolled fully out releases all of its Events.
  const visibleEventIds = useMemo(
    () =>
      reads.flatMap((read) =>
        visibleKeys.includes(read.sectionId)
          ? read.events.map((event) => event.id)
          : [],
      ),
    [visibleKeys, reads],
  );
  const liveEvents = useEventsWithLiveData(venueId, feedEvents, {
    visibleEventIds,
    isVisible: isFocused,
    marketScope: 'card',
  });
  // Splits the live Events back into their sections, in read order.
  const sections = useMemo(() => {
    const result: HomeFeedRead[] = [];
    let start = 0;
    for (const read of reads) {
      const end = start + read.events.length;
      result.push({ ...read, events: liveEvents.slice(start, end) });
      start = end;
    }
    return result;
  }, [reads, liveEvents]);

  usePredictNextMeasurement({
    traceName: TraceName.PredictNextHomeView,
    conditions: [
      capabilities.status !== 'loading',
      ...reads.map((read) => !read.isLoading),
    ],
    debugContext: {
      sectionCount,
      eventCount: liveEvents.length,
      sectionErrorCount: reads.filter((read) => read.isError).length,
    },
  });

  const homeTitle = strings('predict_next.home_title');

  const handleTitleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setTitleSectionHeight(event.nativeEvent.layout.height);
    },
    [setTitleSectionHeight],
  );

  const openPortfolio = useCallback(
    () =>
      navigation.navigate(PredictNextRoutes.PORTFOLIO, {
        venueId,
      }),
    [navigation, venueId],
  );
  const openSearch = useCallback(
    () =>
      navigation.navigate(PredictNextRoutes.SEARCH, {
        venueId,
      }),
    [navigation, venueId],
  );
  const openFeedScreen = useCallback(
    (feedScreenId: FeedScreenId) =>
      navigation.navigate(PredictNextRoutes.FEED, {
        venueId,
        feedScreenId,
      }),
    [navigation, venueId],
  );
  const { openOrderFlow } = usePredictOrderFlow();
  const openEvent = useCallback(
    (event: PredictEvent) =>
      navigation.navigate(PredictNextRoutes.EVENT, {
        venueId: event.venueId,
        eventId: event.id,
        titleSnapshot: event.title,
      }),
    [navigation],
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

  return (
    <Box twClassName="flex-1 bg-default" testID={PredictHomeTestIds.HOME}>
      <HeaderStandardAnimated
        includesTopInset
        title={homeTitle}
        titleProps={{ testID: PredictHomeTestIds.HEADER_TITLE }}
        scrollY={scrollY}
        titleSectionHeight={titleSectionHeightSv}
        endButtonIconProps={
          isVenueSearchSupported(capabilities)
            ? [
                {
                  iconName: IconName.Search,
                  onPress: openSearch,
                  testID: PredictHomeTestIds.SEARCH,
                  accessibilityLabel: strings(
                    'predict_next.search.placeholder',
                  ),
                  accessibilityRole: 'button',
                },
              ]
            : undefined
        }
        {...(navigation.canGoBack()
          ? {
              onBack: () => navigation.goBack(),
              backButtonProps: { testID: PredictHomeTestIds.BACK },
            }
          : {})}
      />
      <Reanimated.ScrollView
        testID={PredictHomeTestIds.SCROLL}
        onScroll={onScroll}
        onLayout={onViewportLayout}
        // The animated handler above only reads contentOffset, so these plain
        // handlers are free; they give the visible-set math the exact resting
        // offset after a drag or fling.
        onScrollEndDrag={onScrollSettled}
        onMomentumScrollEnd={onScrollSettled}
        scrollEventThrottle={16}
      >
        <Box twClassName="gap-6 px-4 pb-8" onLayout={onContentLayout}>
          <Text
            variant={TextVariant.HeadingLg}
            testID={PredictHomeTestIds.TITLE_SECTION}
            onLayout={handleTitleLayout}
          >
            {homeTitle}
          </Text>
          <BalanceSummary
            balance={balanceQuery.data}
            isLoading={balanceQuery.isPending}
            error={balanceQuery.error}
            onRetry={() => balanceQuery.refetch()}
          />
          {/* Funding actions appear when PRED-1162 ships them and the
              Venue descriptor lists deposit or withdraw. */}
          <PortfolioActions onPositionsPress={openPortfolio} />
          <HomeSectionsStatus
            capabilities={capabilities}
            hasSections={sectionCount > 0}
          />
          {sections.map((section) =>
            section.feedId ? (
              <FeedPreviewSection
                key={section.sectionId}
                feedScreenId={section.sectionId}
                onLayout={onSectionLayout(section.sectionId)}
                title={sectionTitle(section.sectionId)}
                events={section.events}
                isLoading={section.isLoading}
                isError={section.isError}
                onOpen={() => openFeedScreen(section.sectionId)}
                onOpenEvent={openEvent}
                onOrder={canBuy ? openOrder : undefined}
                onRetry={section.refetch}
              />
            ) : null,
          )}
        </Box>
      </Reanimated.ScrollView>
    </Box>
  );
};

/**
 * The PredictNext home for the Active Venue. Its sections are the rows of the
 * surface table whose Feed key the Venue's descriptor maps to a Feed.
 */
export const PredictHome = () => {
  const venueId = useNextVenueId();
  const capabilities = useVenueCapabilities(venueId);
  // A section renders, and its Feed is read, only when the Venue has its key.
  const sectionFeeds = useMemo(
    () =>
      resolveSurfaceFeeds(
        capabilities,
        PREDICT_SURFACE_FEED_KEYS.nextHomeSections,
      ),
    [capabilities],
  );

  return (
    <HomeFeedReads venueId={venueId} sectionFeeds={sectionFeeds}>
      {(reads) => (
        <PredictHomeView
          venueId={venueId}
          capabilities={capabilities}
          sectionCount={sectionFeeds.length}
          reads={reads}
        />
      )}
    </HomeFeedReads>
  );
};
