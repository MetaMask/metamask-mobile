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
  SectionDivider,
  Text,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import Reanimated from 'react-native-reanimated';
import { useHeaderGlassInset } from '../../../../../component-library/components-temp/HeaderGlass';
import HeaderStandardAnimatedGlass from '../../../../../component-library/components-temp/HeaderStandardAnimatedGlass';
import ButtonIconGlass from '../../../../../component-library/components-temp/ButtonIconGlass';
import { selectPredictBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/predictBrandRefresh';
import { usePredictNextMeasurement } from '../../hooks/usePredictNextMeasurement';
import { useEventsWithLiveData } from '../../hooks/useEventsWithLiveData';
import { useBalance } from '../../hooks/useBalance';
import {
  KalshiDebugPanel,
  KalshiDebugTestIds,
} from '../../onboarding/KalshiDebugPanel';
import { getFeedScreen, type FeedScreenId } from '../../navigation/feedScreens';
import {
  canPerformVenueAction,
  isVenueSearchSupported,
  useVenueCapabilities,
  type PredictVenueCapabilities,
} from '../../capabilities';
import { useNextVenueId } from '../../implementation';
import {
  usePredictNextDepositAvailable,
  usePredictWithdrawAvailable,
} from '../../funding';
import { PredictVenueSelectorButton } from '../../venueSelection';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import { usePredictOrderFlow } from '../PredictOrderFlow';
import type {
  PredictEvent,
  PredictHomeSection,
  PredictMarket,
  PredictOutcome,
  PredictVenueId,
} from '../../types';
import { TraceName } from '../../../../../util/trace';
import { DepositStatusLine } from '../../components/DepositStatusLine';
import { BalanceSummary } from './internal/BalanceSummary';
import { FeedPreviewSection } from './internal/FeedPreviewSection';
import { HomeCategoriesSection } from './internal/HomeCategoriesSection';
import { resolveHomeCategories } from './internal/homeCategories';
import {
  getHomeSectionTitle,
  planHomeFeedReads,
  selectHomeSections,
  type HomeFeedReadPlan,
  type HomeSectionView,
} from './internal/homeSections';
import { HomeFeedReads, type HomeFeedRead } from './internal/HomeFeedReads';
import { useHomeReadSize } from './internal/useHomeReadSize';
import { HomeGamesError } from './internal/HomeGamesError';
import { HomeSectionsStatus } from './internal/HomeSectionsStatus';
import { HomeSportsSection } from './internal/HomeSportsSection';
import { HomeTrendingSection } from './internal/HomeTrendingSection';
import { PortfolioActions } from './internal/PortfolioActions';
import { useVisibleSections } from './internal/useVisibleSections';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { strings } from '../../../../../../locales/i18n';

const NO_SECTIONS: readonly PredictHomeSection[] = [];

interface PredictHomeViewProps {
  venueId: PredictVenueId;
  capabilities: PredictVenueCapabilities;
  /** The catalog's Home sections, in display order. */
  sections: readonly PredictHomeSection[];
  /** One read per entry of Home's read plan. */
  reads: readonly HomeFeedRead[];
}

const PredictHomeView = ({
  venueId,
  capabilities,
  sections,
  reads,
}: PredictHomeViewProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const isFocused = useIsFocused();
  const { scrollY, titleSectionHeightSv, setTitleSectionHeight, onScroll } =
    useHeaderStandardAnimated();
  const isGlassHeader = useSelector(selectPredictBrandRefreshEnabled) === true;
  const { top: topInset } = useSafeAreaInsets();
  const { inset: headerInset, onLayout: handleHeaderLayout } =
    useHeaderGlassInset(isGlassHeader, topInset);
  // Rows are chosen once per Feed read, so their order is the reads'
  // snapshot: a Game that goes live through streamed data keeps its place
  // until the next Feed read (see selectHomeSections). Rows still loading
  // show skeletons, so their partial picks are neither shown nor watched.
  const home = useMemo(
    () => selectHomeSections(sections, reads),
    [sections, reads],
  );
  const sectionKeys = useMemo(
    () => home.sections.map((section) => section.key),
    [home],
  );
  const {
    visibleKeys,
    onViewportLayout,
    onContentLayout,
    onSectionLayout,
    onScrollSettled,
  } = useVisibleSections({ keys: sectionKeys, scrollY });
  const balanceQuery = useBalance(venueId);
  const canBuy = canPerformVenueAction(capabilities, 'buy');
  const { failedGamesReads } = home;
  const retryFailedGamesReads = useCallback(
    () => failedGamesReads.forEach((read) => read.refetch()),
    [failedGamesReads],
  );
  // Only the Events Home shows are watched. A read can hold more, such as
  // the NCAAF Games Trending leaves out.
  const shownEvents = useMemo(
    () =>
      home.sections.flatMap((section) =>
        'events' in section ? section.events : [],
      ),
    [home],
  );
  // Section-level visibility: every Event of a section that overlaps the
  // viewport is watched; a section scrolled fully out releases its Events.
  const visibleEventIds = useMemo(
    () =>
      home.sections.flatMap((section) =>
        'events' in section && visibleKeys.includes(section.key)
          ? section.events.map((event) => event.id)
          : [],
      ),
    [visibleKeys, home],
  );
  const liveEvents = useEventsWithLiveData(venueId, shownEvents, {
    visibleEventIds,
    isVisible: isFocused,
    marketScope: 'card',
  });
  // Splits the live Events back into the sections, in order.
  const liveSections = useMemo(() => {
    const split: HomeSectionView<HomeFeedRead>[] = [];
    let start = 0;
    for (const section of home.sections) {
      if ('events' in section) {
        const end = start + section.events.length;
        split.push({ ...section, events: liveEvents.slice(start, end) });
        start = end;
      } else {
        split.push(section);
      }
    }
    return split;
  }, [home, liveEvents]);

  usePredictNextMeasurement({
    traceName: TraceName.PredictNextHomeView,
    conditions: [
      capabilities.status !== 'loading',
      ...reads.map((read) => !read.isLoading),
    ],
    debugContext: {
      sectionCount: sections.length,
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
  const canDeposit = usePredictNextDepositAvailable(venueId);
  const openDeposit = useCallback(
    () => navigation.navigate(PredictNextRoutes.DEPOSIT, { venueId }),
    [navigation, venueId],
  );
  const openWithdraw = useCallback(
    () => navigation.navigate(PredictNextRoutes.WITHDRAW, { venueId }),
    [navigation, venueId],
  );
  const withdrawResolution = usePredictWithdrawAvailable();
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
  // A header opens its section's Feed Screen only while the Venue catalog has
  // it with a tab the Venue serves.
  const openableScreen = useCallback(
    (screen: FeedScreenId | undefined) =>
      screen !== undefined && getFeedScreen(screen, capabilities)
        ? () => openFeedScreen(screen)
        : undefined,
    [capabilities, openFeedScreen],
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

  const renderSection = (section: HomeSectionView<HomeFeedRead>) => {
    switch (section.kind) {
      case 'trending':
        return (
          <HomeTrendingSection
            key={section.key}
            events={section.events}
            isLoading={section.isLoading}
            onOpen={openableScreen(section.screen)}
            onOpenEvent={openEvent}
            onOrder={canBuy ? openOrder : undefined}
            onLayout={onSectionLayout(section.key)}
          />
        );
      case 'games-row':
        return (
          <HomeSportsSection
            key={section.key}
            id={section.id}
            title={getHomeSectionTitle(section.id, section.title)}
            events={section.events}
            isLoading={section.isLoading}
            onOpen={openableScreen(section.screen)}
            onOpenEvent={openEvent}
            onOrder={canBuy ? openOrder : undefined}
            onLayout={onSectionLayout(section.key)}
          />
        );
      case 'categories':
        return (
          <HomeCategoriesSection
            key={section.key}
            title={strings('predict_next.home_categories.title')}
            categories={categories}
            onSelect={openCategory}
          />
        );
      case 'feed-preview': {
        const { read } = section;
        return read ? (
          <FeedPreviewSection
            key={section.key}
            sectionId={section.id}
            onLayout={onSectionLayout(section.key)}
            title={getHomeSectionTitle(section.id, section.title)}
            events={section.events}
            isLoading={read.isLoading}
            isError={read.isError}
            onOpen={openableScreen(section.screen)}
            onOpenEvent={openEvent}
            onOrder={canBuy ? openOrder : undefined}
            onRetry={read.refetch}
          />
        ) : null;
      }
      default:
        return null;
    }
  };
  // Whether a section renders content. Trending, games rows and Categories
  // return null when empty; feed-preview returns null when its read is missing.
  const isSectionVisible = (
    section: HomeSectionView<HomeFeedRead>,
  ): boolean => {
    switch (section.kind) {
      case 'feed-preview':
        return section.read !== undefined;
      case 'categories':
        return categories.length > 0;
      default:
        return section.isLoading || section.events.length > 0;
    }
  };
  // Trending, a games row and Categories render nothing when empty, so a
  // layout of only those, out of season, would otherwise leave Home blank below
  // the actions.
  const hasVisibleSection = liveSections.some(isSectionVisible);
  // The games error sits under the last section that reads Games, where the
  // Trending and Sports rows it stands for would be.
  const gamesErrorAfter = liveSections.reduce(
    (last, section, index) =>
      section.kind === 'trending' || section.kind === 'games-row'
        ? index
        : last,
    -1,
  );
  // Collect only the blocks that actually render so SectionDivider sits
  // between PortfolioActions and the first visible block, and strictly
  // between adjacent visible blocks — never doubled or trailing.
  const visibleItems: { key: string; node: React.ReactNode }[] = [];
  liveSections.forEach((section, index) => {
    if (isSectionVisible(section)) {
      const node = renderSection(section);
      if (node !== null) {
        visibleItems.push({ key: section.key, node });
      }
    }
    if (index === gamesErrorAfter && failedGamesReads.length > 0) {
      visibleItems.push({
        key: '__games-error__',
        node: <HomeGamesError onRetry={retryFailedGamesReads} />,
      });
    }
  });

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
            depositStatus={
              <DepositStatusLine
                venueId={venueId}
                testID={PredictHomeTestIds.DEPOSIT_STATUS}
              />
            }
          />
          <PortfolioActions
            onPositionsPress={openPortfolio}
            onAddFundsPress={canDeposit ? openDeposit : undefined}
            onWithdrawPress={
              withdrawResolution.status === 'ready' ? openWithdraw : undefined
            }
          />
          {visibleItems.length > 0 ? (
            <SectionDivider
              marginVertical={0}
              twClassName="-mx-4"
              testID={PredictHomeTestIds.DIVIDER}
            />
          ) : null}
          <HomeSectionsStatus
            capabilities={capabilities}
            hasSections={hasVisibleSection}
          />
          {visibleItems.map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 ? (
                <SectionDivider
                  marginVertical={0}
                  twClassName="-mx-4"
                  testID={PredictHomeTestIds.DIVIDER}
                />
              ) : null}
              {item.node}
            </React.Fragment>
          ))}
        </Box>
      </Reanimated.ScrollView>
    </Box>
  );
};

/**
 * The PredictNext home for the Active Venue. Its sections, their order and
 * the Feeds they read come from the Venue catalog's `home` (PRED-1527), so
 * the server changes Home without a release. Without a usable `home`, Home
 * shows Balance, the Portfolio actions and its unavailable state.
 */
export const PredictHome = () => {
  const venueId = useNextVenueId();
  const capabilities = useVenueCapabilities(venueId);
  const isConstrained = useHomeReadSize(capabilities.status === 'ready');
  const sections =
    capabilities.status === 'ready'
      ? (capabilities.descriptor.home?.sections ?? NO_SECTIONS)
      : NO_SECTIONS;
  const plan = useMemo<readonly HomeFeedReadPlan[]>(
    () => planHomeFeedReads(sections, capabilities, isConstrained ?? false),
    [sections, capabilities, isConstrained],
  );

  return (
    <HomeFeedReads
      venueId={venueId}
      plan={plan}
      isHeld={isConstrained === undefined}
    >
      {(reads) => (
        <PredictHomeView
          venueId={venueId}
          capabilities={capabilities}
          sections={sections}
          reads={reads}
        />
      )}
    </HomeFeedReads>
  );
};
