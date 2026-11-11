import React, { useCallback, useMemo } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIconSize,
  IconName,
  Text,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import Reanimated from 'react-native-reanimated';
import { useHeaderGlassInset } from '../../../../../component-library/components-temp/HeaderGlass';
import HeaderStandardAnimatedGlass from '../../../../../component-library/components-temp/HeaderStandardAnimatedGlass';
import ButtonIconGlass from '../../../../../component-library/components-temp/ButtonIconGlass';
import { selectPredictBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/predictBrandRefresh';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { useEventsWithLiveData } from '../../hooks/useEventsWithLiveData';
import { useBalance } from '../../hooks/useBalance';
import {
  KalshiDebugPanel,
  KalshiDebugTestIds,
} from '../../onboarding/KalshiDebugPanel';
import {
  FEED_SCREENS,
  NFL_FEED_SCREEN_ID,
  POLITICS_FEED_SCREEN_ID,
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
import { PredictVenueSelectorButton } from '../../venueSelection';
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
import { HomeCategoriesSection } from './internal/HomeCategoriesSection';
import { resolveHomeCategories } from './internal/homeCategories';
import { selectHomeFeedRows } from './internal/homeFeedRows';
import {
  HOME_SECTION_IDS,
  HomeFeedReads,
  type HomeFeedRead,
} from './internal/HomeFeedReads';
import { HomeSectionsStatus } from './internal/HomeSectionsStatus';
import { HomeSportsSection } from './internal/HomeSportsSection';
import { HomeTrendingSection } from './internal/HomeTrendingSection';
import { PortfolioActions } from './internal/PortfolioActions';
import { useVisibleSections } from './internal/useVisibleSections';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { strings } from '../../../../../../locales/i18n';

const sectionTitle = (sectionId: FeedScreenId) => {
  const feedScreen: FeedScreenDefinition = FEED_SCREENS[sectionId];
  return feedScreen.selectionLabel ?? feedScreen.title;
};

// The reads before Politics feed the Trending and Sports rows. Categories sit
// below the rows, and Politics and any section after it below Categories.
const CATEGORIES_INDEX = HOME_SECTION_IDS.indexOf(POLITICS_FEED_SCREEN_ID);

const TRENDING_ROW = 'trending-row';
const SPORTS_ROW = 'sports-row';
type HomeRowKey = typeof TRENDING_ROW | typeof SPORTS_ROW | FeedScreenId;
/** Everything on Home that shows Events, in display order. */
const HOME_ROW_KEYS: readonly HomeRowKey[] = [
  TRENDING_ROW,
  SPORTS_ROW,
  ...HOME_SECTION_IDS.slice(CATEGORIES_INDEX),
];

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
  const appNavigation = useNavigation<AppNavigationProp>();
  const isFocused = useIsFocused();
  const { scrollY, titleSectionHeightSv, setTitleSectionHeight, onScroll } =
    useHeaderStandardAnimated();
  const isGlassHeader = useSelector(selectPredictBrandRefreshEnabled) === true;
  const { top: topInset } = useSafeAreaInsets();
  const { inset: headerInset, onLayout: handleHeaderLayout } =
    useHeaderGlassInset(isGlassHeader, topInset);
  const {
    visibleKeys,
    onViewportLayout,
    onContentLayout,
    onSectionLayout,
    onScrollSettled,
  } = useVisibleSections({ keys: HOME_ROW_KEYS, scrollY });
  const balanceQuery = useBalance(venueId);
  const canBuy = canPerformVenueAction(capabilities, 'buy');
  const rows = useMemo(
    () => selectHomeFeedRows(reads, CATEGORIES_INDEX),
    [reads],
  );
  // Only the Events Home shows are watched. A read can hold more, such as
  // the NCAAF Games Trending leaves out.
  const shownEvents = useMemo(
    () => [
      ...rows.trending,
      ...rows.sports,
      ...rows.sections.flatMap((section) => section.events),
    ],
    [rows],
  );
  // Row-level visibility: every Event of a row that overlaps the viewport is
  // watched; a row scrolled fully out releases all of its Events.
  const visibleEventIds = useMemo(() => {
    const idsIfVisible = (key: HomeRowKey, events: readonly PredictEvent[]) =>
      visibleKeys.includes(key) ? events.map((event) => event.id) : [];
    return [
      ...idsIfVisible(TRENDING_ROW, rows.trending),
      ...idsIfVisible(SPORTS_ROW, rows.sports),
      ...rows.sections.flatMap((section) =>
        idsIfVisible(section.sectionId, section.events),
      ),
    ];
  }, [visibleKeys, rows]);
  const liveEvents = useEventsWithLiveData(venueId, shownEvents, {
    visibleEventIds,
    isVisible: isFocused,
    marketScope: 'card',
  });
  // Splits the live Events back into the rows and sections, in order.
  const liveRows = useMemo(() => {
    const trendingEnd = rows.trending.length;
    const sportsEnd = trendingEnd + rows.sports.length;
    const sections: HomeFeedRead[] = [];
    let start = sportsEnd;
    for (const section of rows.sections) {
      const end = start + section.events.length;
      sections.push({ ...section, events: liveEvents.slice(start, end) });
      start = end;
    }
    return {
      trending: liveEvents.slice(0, trendingEnd),
      sports: liveEvents.slice(trendingEnd, sportsEnd),
      sections,
    };
  }, [rows, liveEvents]);
  // Trending ranks Games across every read, so it waits for all of them.
  const isTrendingLoading = reads.some((read) => read.isLoading);
  const isSportsLoading =
    reads.find((read) => read.sectionId === NFL_FEED_SCREEN_ID)?.isLoading ??
    false;

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
  // The Trending header leaves Predict for the app's Explore tab.
  const openTrending = useCallback(
    () => appNavigation.navigate(Routes.TRENDING_VIEW),
    [appNavigation],
  );
  const openSports = useCallback(
    () => openFeedScreen(NFL_FEED_SCREEN_ID),
    [openFeedScreen],
  );
  const categories = useMemo(
    () => resolveHomeCategories(capabilities),
    [capabilities],
  );
  const openCategory = useCallback(
    (categoryId: string) => {
      const category = categories.find(({ id }) => id === categoryId);
      if (category) {
        navigation.navigate(PredictNextRoutes.FEED, {
          venueId,
          feedScreenId: category.feedScreenId,
          selectedTabId: category.tabId,
        });
      }
    },
    [categories, navigation, venueId],
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

  const renderSection = (section: HomeFeedRead) =>
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
    ) : null;

  return (
    <Box twClassName="flex-1 bg-default" testID={PredictHomeTestIds.HOME}>
      <HeaderStandardAnimatedGlass
        isGlass={isGlassHeader}
        onLayout={handleHeaderLayout}
        includesTopInset
        title={homeTitle}
        titleProps={{ testID: PredictHomeTestIds.HEADER_TITLE }}
        scrollY={scrollY}
        titleSectionHeight={titleSectionHeightSv}
        endAccessory={
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <PredictVenueSelectorButton
              variant={isGlassHeader ? 'glass' : 'standard'}
            />
            {isVenueSearchSupported(capabilities) ? (
              <ButtonIconGlass
                isCapsule={isGlassHeader}
                size={ButtonIconSize.Md}
                iconName={IconName.Search}
                onPress={openSearch}
                testID={PredictHomeTestIds.SEARCH}
                accessibilityLabel={strings('predict_next.search.placeholder')}
                accessibilityRole="button"
              />
            ) : null}
            {/* TEMPORARY: Kalshi demo onboarding debug. Self-gates on a
                development build with Kalshi authentication on. Remove with
                the demo onboarding. */}
            <KalshiDebugPanel
              renderTrigger={(open) => (
                <ButtonIconGlass
                  isCapsule={isGlassHeader}
                  size={ButtonIconSize.Md}
                  iconName={IconName.Flask}
                  onPress={open}
                  testID={KalshiDebugTestIds.OPEN}
                  accessibilityLabel="User debug"
                  accessibilityRole="button"
                />
              )}
            />
          </Box>
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
        contentContainerStyle={{ paddingTop: headerInset }}
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
          <HomeTrendingSection
            events={liveRows.trending}
            isLoading={isTrendingLoading}
            onOpen={openTrending}
            onOpenEvent={openEvent}
            onOrder={canBuy ? openOrder : undefined}
            onLayout={onSectionLayout(TRENDING_ROW)}
          />
          <HomeSportsSection
            events={liveRows.sports}
            isLoading={isSportsLoading}
            onOpen={openSports}
            onOpenEvent={openEvent}
            onOrder={canBuy ? openOrder : undefined}
            onLayout={onSectionLayout(SPORTS_ROW)}
          />
          <HomeSectionsStatus
            capabilities={capabilities}
            hasSections={sectionCount > 0}
          />
          <HomeCategoriesSection
            title={strings('predict_next.home_categories.title')}
            categories={categories}
            onSelect={openCategory}
          />
          {liveRows.sections.map(renderSection)}
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
