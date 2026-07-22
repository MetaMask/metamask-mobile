import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import {
  type PerpsMarketData,
  type Position,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import SectionRow from '../../components/SectionRow';
import ErrorState from '../../components/ErrorState';
import Routes from '../../../../../constants/navigation/Routes';
import {
  usePerpsLivePositions,
  usePerpsLiveOrders,
  usePerpsLiveAccount,
} from '../../../../UI/Perps/hooks';
import {
  formatPnl,
  formatPercentage,
} from '../../../../UI/Perps/utils/formatUtils';
import { usePerpsConnection } from '../../../../UI/Perps/hooks/usePerpsConnection';
import PerpsCard from '../../../../UI/Perps/components/PerpsCard';
import PerpsPositionSkeleton from './components/PerpsPositionSkeleton';
import PerpsTrendingCarousel from './components/PerpsTrendingCarousel';
import PerpsPillsRail from './components/PerpsPillsRail';
import { useHomepageSparklines } from './hooks/useHomepageSparklines';
import { usePerpsTrendingCarouselData } from './hooks/usePerpsTrendingCarouselData';
import { strings } from '../../../../../../locales/i18n';
import type { SectionRefreshHandle } from '../../types';
import { usePerpsEventTracking } from '../../../../UI/Perps/hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { useSectionPerformanceV2 } from '../../hooks/useSectionPerformanceV2';
import type { PerpsSectionProps } from './PerpsSectionWithProvider';
import HomepageSectionUnrealizedPnlRow, {
  type HomepageUnrealizedPnlTone,
} from '../../components/HomepageSectionUnrealizedPnlRow';
import { useHomepageTrendingTransactionActiveAbTests } from '../../hooks/useHomepageTrendingTransactionActiveAbTests';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
import { usePerpsNavigationHandlers } from './hooks/usePerpsNavigationHandlers';
import { useHomepagePerpsPillsEmptyTransactionActiveAbTests } from '../../hooks/useHomepagePerpsPillsEmptyTransactionActiveAbTests';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { usePerpsFeed } from '../../../TrendingView/feeds/perps/usePerpsFeed';
import { HOMEPAGE_THROTTLE_MS, MAX_ITEMS } from './constants';

/**
 * PerpsSection — single "Perpetuals" section on the homepage.
 *
 * Shows open positions + limit orders when the user has any,
 * otherwise shows the configured empty state content.
 *
 * Must be rendered inside PerpsConnectionProvider + PerpsStreamProvider.
 */
const PerpsSectionMain = forwardRef<SectionRefreshHandle, PerpsSectionProps>(
  (
    {
      sectionIndex,
      totalSectionsLoaded,
      mode = 'default',
      sectionName: sectionNameOverride,
      titleOverride,
      emptyStateContent = 'tiles',
      emptyStateTitleOverride,
    },
    ref,
  ) => {
    const sectionViewRef = useRef<View>(null);
    const defaultTitle = strings('homepage.sections.perpetuals');
    const baseTitle = titleOverride ?? defaultTitle;
    const analyticsName = sectionNameOverride ?? HomeSectionNames.PERPS;
    const isPositionsOnly = mode === 'positions-only';
    const usesPillsEmptyState =
      !isPositionsOnly && emptyStateContent === 'pills';
    const { error: connectionError, reconnectWithNewContext } =
      usePerpsConnection();
    const { track } = usePerpsEventTracking();
    const privacyMode = useSelector(selectPrivacyMode);

    const { positions, isInitialLoading: positionsLoading } =
      usePerpsLivePositions({
        throttleMs: HOMEPAGE_THROTTLE_MS,
      });

    const { account: perpsAccount, isInitialLoading: perpsAccountLoading } =
      usePerpsLiveAccount({
        throttleMs: HOMEPAGE_THROTTLE_MS,
      });

    const { orders, isInitialLoading: ordersLoading } = usePerpsLiveOrders({
      hideTpSl: true,
      throttleMs: HOMEPAGE_THROTTLE_MS,
    });

    const hookLoading = positionsLoading || ordersLoading;

    // `deferredLoading` lags `hookLoading` by one render cycle.
    // usePerpsLivePositions sets isInitialLoading=false and rawPositions in the
    // same batch, but enriched `positions` updates one render later via useEffect.
    // Keeping the skeleton visible until both flags are false bridges that gap
    // and prevents a single-frame flash of empty content.
    const [deferredLoading, setDeferredLoading] = useState(hookLoading);
    useEffect(() => {
      setDeferredLoading(hookLoading);
    }, [hookLoading]);

    const showSkeleton = hookLoading || deferredLoading;

    const displayPositions = useMemo(
      () => positions.slice(0, MAX_ITEMS),
      [positions],
    );

    const remainingSlots = MAX_ITEMS - displayPositions.length;
    const displayOrders = useMemo(
      () => (remainingSlots > 0 ? orders.slice(0, remainingSlots) : []),
      [orders, remainingSlots],
    );

    const hasItems = displayPositions.length > 0 || displayOrders.length > 0;
    // Wait for positions/orders load before pills empty UI (matches legacy
    // HomepagePerpsTreatmentEmptyBranch: !showSkeleton && !hasItems).
    const shouldShowPillsEmptyState =
      usesPillsEmptyState && !showSkeleton && !hasItems;
    const shouldLoadMarkets = !isPositionsOnly && !shouldShowPillsEmptyState;

    const { markets, marketsLoading, allCarouselMarkets, watchlistSymbolSet } =
      usePerpsTrendingCarouselData({
        skipInitialFetch: !shouldLoadMarkets,
      });
    const title =
      shouldShowPillsEmptyState && !connectionError
        ? (emptyStateTitleOverride ?? baseTitle)
        : baseTitle;

    const trendingTransactionActiveAbTests =
      useHomepageTrendingTransactionActiveAbTests();
    const perpsPillsEmptyTransactionActiveAbTests =
      useHomepagePerpsPillsEmptyTransactionActiveAbTests(
        shouldShowPillsEmptyState,
      );
    const {
      data: perpsPillsData,
      isLoading: isPerpsPillsLoading,
      refetch: refetchPerpsPills,
    } = usePerpsFeed({
      variant: 'all',
      withTileExtras: false,
      skipInitialFetch: !shouldShowPillsEmptyState,
    });
    const {
      marketDetailsTransactionActiveAbTests,
      navigateToTutorialOrScreen,
      handleViewAllPerps,
      handleViewMorePerps,
      handleTilePress,
    } = usePerpsNavigationHandlers({
      trendingTransactionActiveAbTests,
      extraTransactionActiveAbTests: perpsPillsEmptyTransactionActiveAbTests,
    });

    const handleTrendingMarketPress = useCallback(
      (market: PerpsMarketData) => {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.OPEN_POSITION,
          [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
            PERPS_EVENT_VALUE.BUTTON_LOCATION.WALLET_HOME,
          ...(marketDetailsTransactionActiveAbTests?.length
            ? { active_ab_tests: marketDetailsTransactionActiveAbTests }
            : {}),
        });
        handleTilePress(market);
      },
      [handleTilePress, marketDetailsTransactionActiveAbTests, track],
    );

    const hasFilledPositions = positions.length > 0;

    // When user has no positions/orders, keep skeleton visible until markets load.
    const pendingTrending =
      !showSkeleton &&
      !hasItems &&
      !shouldShowPillsEmptyState &&
      marketsLoading;
    const showTrending =
      !showSkeleton &&
      !hasItems &&
      !shouldShowPillsEmptyState &&
      !marketsLoading;
    const carouselSymbols = useMemo(
      () =>
        showTrending && !isPositionsOnly
          ? allCarouselMarkets.map((m) => m.symbol)
          : [],
      [allCarouselMarkets, isPositionsOnly, showTrending],
    );
    const { sparklines, refresh: refreshSparklines } =
      useHomepageSparklines(carouselSymbols);

    const showHomepageUnrealizedPnl =
      !showSkeleton && !pendingTrending && hasFilledPositions && !privacyMode;

    const homepageUnrealizedPnl = useMemo(() => {
      if (!showHomepageUnrealizedPnl) {
        return null;
      }
      const unrealizedPnl = perpsAccount?.unrealizedPnl ?? '0';
      const roe = parseFloat(perpsAccount?.returnOnEquity || '0');
      const pnlNum = parseFloat(unrealizedPnl);
      const valueText = `${formatPnl(pnlNum)} (${formatPercentage(roe, 1)})`;
      const tone: HomepageUnrealizedPnlTone =
        pnlNum > 0 ? 'positive' : pnlNum < 0 ? 'negative' : 'neutral';
      return { valueText, tone };
    }, [perpsAccount, showHomepageUnrealizedPnl]);

    useImperativeHandle(
      ref,
      () => ({
        refresh: async () => {
          if (connectionError) {
            await reconnectWithNewContext({ force: true });
            return;
          }
          if (shouldShowPillsEmptyState) {
            await refetchPerpsPills();
            return;
          }
          refreshSparklines();
        },
      }),
      [
        connectionError,
        refetchPerpsPills,
        reconnectWithNewContext,
        refreshSparklines,
        shouldShowPillsEmptyState,
      ],
    );

    const handlePositionPress = useCallback(
      (position: Position) => {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.OPEN_POSITION,
          [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
            PERPS_EVENT_VALUE.BUTTON_LOCATION.WALLET_HOME,
        });
        const market =
          markets.find((m) => m.symbol === position.symbol) ??
          perpsPillsData.find((item) => item.market.symbol === position.symbol)
            ?.market;
        navigateToTutorialOrScreen(Routes.PERPS.MARKET_DETAILS, {
          market: (market ?? {
            symbol: position.symbol,
            maxLeverage: position.maxLeverage,
          }) as PerpsMarketData,
          initialTab: 'position',
          source: 'section_position',
        });
      },
      [navigateToTutorialOrScreen, markets, perpsPillsData, track],
    );
    // Pass null while loading so the hook uses the immediate-fire path and
    // does not fire from viewport visibility with stale itemCount/isEmpty.
    // positions-only: never wait on market/trending data — analytics for empty
    // sections must not block on unrelated REST market loads (see pendingTrending).
    const isLoadingSection = isPositionsOnly
      ? showSkeleton
      : hookLoading ||
        deferredLoading ||
        pendingTrending ||
        (shouldShowPillsEmptyState && isPerpsPillsLoading);

    const isEmpty = !hasItems;

    const positionsOnlyHidden = isPositionsOnly && !hasItems && !showSkeleton;
    const pillsEmptyFeedHidden =
      shouldShowPillsEmptyState &&
      !showSkeleton &&
      !isPerpsPillsLoading &&
      perpsPillsData.length === 0;

    const willRender = isPositionsOnly
      ? !showSkeleton && hasItems
      : !isLoadingSection && !pillsEmptyFeedHidden;

    const itemCount = hasItems
      ? displayPositions.length + displayOrders.length
      : 0;

    const { onLayout } = useHomeViewedEvent({
      sectionRef:
        willRender && !positionsOnlyHidden && !pillsEmptyFeedHidden
          ? sectionViewRef
          : null,
      isLoading: isLoadingSection,
      sectionName: analyticsName,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty,
      itemCount,
      fireImmediateWhenNoView: !positionsOnlyHidden && !pillsEmptyFeedHidden,
    });

    useSectionPerformance({
      sectionId: analyticsName,
      contentReady: !isLoadingSection,
      isEmpty: !hasItems,
      contentStateForTrace: connectionError ? 'error' : undefined,
      isLoading: isLoadingSection,
    });

    const hasVisibleContent =
      hasItems ||
      showTrending ||
      shouldShowPillsEmptyState ||
      !!connectionError;
    const { onContentLayout } = useSectionPerformanceV2({
      sectionId: analyticsName,
      sectionMode: mode,
      sectionVariant: shouldShowPillsEmptyState
        ? 'pills_empty_state'
        : hasItems
          ? 'positions'
          : 'trending',
      contentReady: !isLoadingSection || !!connectionError,
      isEmpty: !hasVisibleContent,
      contentStateForTrace: connectionError ? 'error' : undefined,
      isLoading: isLoadingSection,
      requiresLayout: !positionsOnlyHidden && !pillsEmptyFeedHidden,
      itemCount,
    });

    const handleLayout = useCallback(
      (event: LayoutChangeEvent) => {
        onLayout();
        onContentLayout(event);
      },
      [onContentLayout, onLayout],
    );

    // positions-only: hide when empty before connection error UI (WS failure must not show error for empty section)
    if (isPositionsOnly && !hasItems && !showSkeleton) {
      return null;
    }

    const showsVerticalPositions = showSkeleton || pendingTrending || hasItems;

    if (connectionError) {
      return (
        <View ref={sectionViewRef} onLayout={handleLayout}>
          <Box paddingBottom={3}>
            <SectionDivider />
            <SectionHeader
              title={title}
              isInteractive
              onPress={handleViewAllPerps}
              testID={homepageSectionTitleTestId(analyticsName)}
            />
            <ErrorState
              title={strings('homepage.error.unable_to_load', {
                section: title.toLowerCase(),
              })}
              onRetry={() => reconnectWithNewContext({ force: true })}
            />
          </Box>
        </View>
      );
    }

    if (pillsEmptyFeedHidden) {
      return null;
    }

    const shouldAddContentTopGap =
      !showHomepageUnrealizedPnl && !shouldShowPillsEmptyState;

    const sectionContent = (
      <>
        <SectionDivider />
        <SectionHeader
          title={title}
          isInteractive
          onPress={handleViewAllPerps}
          testID={homepageSectionTitleTestId(analyticsName)}
        />
        <Box gap={3} paddingTop={shouldAddContentTopGap ? 3 : undefined}>
          {showHomepageUnrealizedPnl && (
            <HomepageSectionUnrealizedPnlRow
              isLoading={perpsAccountLoading}
              valueText={homepageUnrealizedPnl?.valueText}
              tone={homepageUnrealizedPnl?.tone ?? 'neutral'}
              label={strings('perps.unrealized_pnl')}
              testID="homepage-perps-unrealized-pnl"
            />
          )}
          {showSkeleton || pendingTrending || hasItems ? (
            <SectionRow>
              {showSkeleton || pendingTrending ? (
                <PerpsPositionSkeleton />
              ) : (
                <Box testID="homepage-perps-positions">
                  {displayPositions.map((position) => (
                    <PerpsCard
                      key={position.symbol}
                      position={position}
                      onPress={() => handlePositionPress(position)}
                      testID={`perps-position-row-${position.symbol}`}
                    />
                  ))}
                  {displayOrders.map((order) => (
                    <PerpsCard
                      key={order.orderId}
                      order={order}
                      testID={`perps-order-row-${order.orderId}`}
                    />
                  ))}
                </Box>
              )}
            </SectionRow>
          ) : shouldShowPillsEmptyState ? (
            <PerpsPillsRail
              data={perpsPillsData}
              isLoading={isPerpsPillsLoading}
              onPressMarket={handleTrendingMarketPress}
            />
          ) : (
            <PerpsTrendingCarousel
              markets={allCarouselMarkets}
              watchlistSymbolSet={watchlistSymbolSet}
              sparklines={sparklines}
              onPressMarket={handleTrendingMarketPress}
              onPressViewMore={handleViewMorePerps}
            />
          )}
        </Box>
      </>
    );

    return (
      <View ref={sectionViewRef} onLayout={handleLayout}>
        {showsVerticalPositions ? (
          sectionContent
        ) : (
          <Box paddingBottom={3}>{sectionContent}</Box>
        )}
      </View>
    );
  },
);

PerpsSectionMain.displayName = 'PerpsSectionMain';

export default PerpsSectionMain;
