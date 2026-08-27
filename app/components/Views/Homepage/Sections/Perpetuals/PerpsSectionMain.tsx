import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
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
import useSectionViewportVisible from '../../hooks/useSectionViewportVisible';
import type { PerpsSectionProps } from './PerpsSectionWithProvider';
import HomepageSectionUnrealizedPnlRow, {
  type HomepageUnrealizedPnlTone,
} from '../../components/HomepageSectionUnrealizedPnlRow';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
import { usePerpsNavigationHandlers } from './hooks/usePerpsNavigationHandlers';
import { useHomepagePerpsPillsEmptyTransactionActiveAbTests } from '../../hooks/useHomepagePerpsPillsEmptyTransactionActiveAbTests';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { usePerpsFeed } from '../../../TrendingView/feeds/perps/usePerpsFeed';
import { HOMEPAGE_THROTTLE_MS, MAX_ITEMS } from './constants';
import {
  finishPerpsLoadingSession,
  resolvePerpsMarketSource,
} from '../../../../UI/Perps/utils/perpsLoadingSession';
import { usePerpsHomepageLoadingSession } from './hooks/usePerpsHomepageLoadingSession';
import { useHomepagePerpsSurfaceMetrics } from './hooks/useHomepagePerpsSurfaceMetrics';

type HomepagePerpsContentVariant =
  | 'positions_and_orders'
  | 'positions'
  | 'orders'
  | 'pills'
  | 'trending';

const resolveContentVariant = (
  positionCount: number,
  orderCount: number,
  showPills: boolean,
): HomepagePerpsContentVariant => {
  if (positionCount > 0 && orderCount > 0) return 'positions_and_orders';
  if (positionCount > 0) return 'positions';
  if (orderCount > 0) return 'orders';
  return showPills ? 'pills' : 'trending';
};

const resolveContentState = (hasError: boolean, hasItems: boolean) => {
  if (hasError) return 'error';
  return hasItems ? 'filled' : 'empty';
};

/**
 * PerpsSection — single "Perps" section on the homepage.
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
      emptyStateContent = 'tiles',
      emptyStateTitleOverride,
    },
    ref,
  ) => {
    const isHomepageFocused = useIsFocused();
    const { proposedLifecycle, sessionContext, sessionReady } =
      usePerpsHomepageLoadingSession(isHomepageFocused);
    const sectionViewRef = useRef<View>(null);
    const baseTitle = strings('homepage.sections.perps');
    const usesPillsEmptyState = emptyStateContent === 'pills';
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
      // Orders are low-frequency user state and should render immediately.
      throttleMs: 0,
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
    const shouldLoadMarkets = !shouldShowPillsEmptyState;

    const {
      markets,
      marketsLoading,
      hasResolvedInitialData,
      allCarouselMarkets,
      watchlistSymbolSet,
      refreshMarkets,
    } = usePerpsTrendingCarouselData({
      skipInitialFetch: !shouldLoadMarkets,
    });
    const title =
      shouldShowPillsEmptyState && !connectionError
        ? (emptyStateTitleOverride ?? baseTitle)
        : baseTitle;

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
      transactionActiveAbTests: perpsPillsEmptyTransactionActiveAbTests,
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
      (marketsLoading || !hasResolvedInitialData);
    const showTrending =
      !showSkeleton &&
      !hasItems &&
      !shouldShowPillsEmptyState &&
      hasResolvedInitialData &&
      !marketsLoading;
    const carouselSymbols = useMemo(
      () => (showTrending ? allCarouselMarkets.map((m) => m.symbol) : []),
      [allCarouselMarkets, showTrending],
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
          await refreshMarkets();
          refreshSparklines();
        },
      }),
      [
        connectionError,
        refetchPerpsPills,
        reconnectWithNewContext,
        refreshMarkets,
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
    const contentVariant = resolveContentVariant(
      displayPositions.length,
      displayOrders.length,
      shouldShowPillsEmptyState,
    );
    const isAccountBackedContent =
      contentVariant === 'positions' ||
      contentVariant === 'orders' ||
      contentVariant === 'positions_and_orders';
    const isLoadingSection =
      hookLoading ||
      deferredLoading ||
      pendingTrending ||
      (isAccountBackedContent && perpsAccountLoading) ||
      (shouldShowPillsEmptyState && isPerpsPillsLoading);

    const isEmpty = !hasItems;

    const pillsEmptyFeedHidden =
      shouldShowPillsEmptyState &&
      !showSkeleton &&
      !isPerpsPillsLoading &&
      perpsPillsData.length === 0;

    const willRender = !isLoadingSection && !pillsEmptyFeedHidden;

    const itemCount = hasItems
      ? displayPositions.length + displayOrders.length
      : 0;

    const { isVisible: isSectionVisible, onLayout: handleSectionLayout } =
      useSectionViewportVisible(sectionViewRef, {
        isLoading: isLoadingSection,
      });

    useHomeViewedEvent({
      sectionRef: willRender && !pillsEmptyFeedHidden ? sectionViewRef : null,
      isLoading: isLoadingSection,
      sectionName: HomeSectionNames.PERPS,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty,
      itemCount,
      isVisible: isSectionVisible,
      fireImmediateWhenNoView: !pillsEmptyFeedHidden,
    });

    const lifecycle = sessionContext?.lifecycle ?? proposedLifecycle;
    const sessionId = sessionContext?.id;
    const surfaceContentVariant = connectionError ? 'error' : contentVariant;
    const completionCountData = useMemo<Record<string, number>>(() => {
      const counts: Record<string, number> = {};
      if (surfaceContentVariant === 'pills') {
        counts.pill_count = perpsPillsData.length;
      } else if (surfaceContentVariant === 'trending') {
        counts.market_count = allCarouselMarkets.length;
      } else if (surfaceContentVariant !== 'error') {
        counts.item_count = displayPositions.length + displayOrders.length;
      }
      return counts;
    }, [
      allCarouselMarkets.length,
      displayOrders.length,
      displayPositions.length,
      perpsPillsData.length,
      surfaceContentVariant,
    ]);
    const hasSurfaceContent =
      contentVariant === 'trending'
        ? allCarouselMarkets.length > 0
        : contentVariant === 'pills'
          ? perpsPillsData.length > 0
          : hasItems;
    const marketSource = resolvePerpsMarketSource(sessionContext?.marketSource);
    const accountSource = sessionContext?.accountSource ?? 'unknown';
    const cohortTags = useMemo(
      () => ({
        content_variant: surfaceContentVariant,
        lifecycle,
        surface: 'homepage',
        ...(marketSource === 'unknown' ? {} : { market_source: marketSource }),
        ...(accountSource === 'unknown'
          ? {}
          : { account_source: accountSource }),
      }),
      [accountSource, lifecycle, marketSource, surfaceContentVariant],
    );
    const contentReady =
      sessionReady && (Boolean(connectionError) || !isLoadingSection);
    useHomepagePerpsSurfaceMetrics({
      isVisible: isSectionVisible,
      isRendered: !pillsEmptyFeedHidden,
      isFocused: isHomepageFocused,
      sessionId,
      lifecycle,
      contentVariant: surfaceContentVariant,
      contentReady,
      hasError: Boolean(connectionError),
      marketSource,
      resolvedSource: isAccountBackedContent ? accountSource : marketSource,
    });
    useSectionPerformance({
      sectionId: HomeSectionNames.PERPS,
      enabled: Boolean(sessionId),
      generationKey: sessionId,
      acceptReadyContentOnGenerationStart:
        lifecycle === 'navigate_return' || lifecycle === 'background_short',
      contentReady,
      isEmpty: !hasItems,
      contentStateForTrace: connectionError ? 'error' : undefined,
      isLoading: isLoadingSection,
      tags: cohortTags,
      data: sessionContext
        ? { perps_session_id: sessionContext.id }
        : undefined,
    });

    useEffect(() => {
      if (!sessionReady || !sessionId) return;
      if (pillsEmptyFeedHidden) {
        finishPerpsLoadingSession(
          {
            success: true,
            content_state: 'empty',
            ...completionCountData,
            ...cohortTags,
            content_variant: 'hidden',
          },
          sessionId,
        );
        return;
      }
      if (isLoadingSection && !connectionError) return;
      finishPerpsLoadingSession(
        {
          success: !connectionError,
          content_state: resolveContentState(
            Boolean(connectionError),
            hasSurfaceContent,
          ),
          ...completionCountData,
          ...cohortTags,
        },
        sessionId,
      );
    }, [
      cohortTags,
      completionCountData,
      connectionError,
      hasSurfaceContent,
      isLoadingSection,
      pillsEmptyFeedHidden,
      sessionId,
      sessionReady,
    ]);

    const showsVerticalPositions = showSkeleton || pendingTrending || hasItems;

    if (connectionError) {
      return (
        <View ref={sectionViewRef} onLayout={handleSectionLayout}>
          <Box paddingBottom={3}>
            <SectionDivider />
            <SectionHeader
              title={title}
              isInteractive
              onPress={handleViewAllPerps}
              testID={homepageSectionTitleTestId(HomeSectionNames.PERPS)}
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
          testID={homepageSectionTitleTestId(HomeSectionNames.PERPS)}
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
            showSkeleton || pendingTrending ? (
              <SectionRow>
                <PerpsPositionSkeleton />
              </SectionRow>
            ) : (
              <Box testID="homepage-perps-positions" collapsable={false}>
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
            )
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
      <View ref={sectionViewRef} onLayout={handleSectionLayout}>
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
