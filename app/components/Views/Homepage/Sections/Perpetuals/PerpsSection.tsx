import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import {
  type PerpsMarketData,
  type Position,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import type { PerpsMarketDataWithVolumeNumber } from '../../../../UI/Perps/hooks/usePerpsMarkets';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import SectionRow from '../../components/SectionRow';
import ErrorState from '../../components/ErrorState';
import Routes from '../../../../../constants/navigation/Routes';
import {
  usePerpsLivePositions,
  usePerpsLiveOrders,
  usePerpsMarkets,
  usePerpsLiveAccount,
} from '../../../../UI/Perps/hooks';
import {
  formatPnl,
  formatPercentage,
} from '../../../../UI/Perps/utils/formatUtils';
import { usePerpsConnection } from '../../../../UI/Perps/hooks/usePerpsConnection';
import { filterAndSortMarkets } from '../../../../UI/Perps/utils/filterAndSortMarkets';
import {
  selectPerpsWatchlistMarkets,
  selectIsFirstTimePerpsUser,
} from '../../../../UI/Perps/selectors/perpsController';
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import PerpsCard from '../../../../UI/Perps/components/PerpsCard';
import PerpsPositionSkeleton from './components/PerpsPositionSkeleton';
import PerpsMarketTileCard from './components/PerpsMarketTileCard';
import ViewMoreCard from '../../components/ViewMoreCard';
import { useHomepageSparklines } from './hooks/useHomepageSparklines';
import { strings } from '../../../../../../locales/i18n';
import type { SectionRefreshHandle } from '../../types';
import { usePerpsEventTracking } from '../../../../UI/Perps/hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import type { PerpsSectionProps } from './PerpsSectionWithProvider';
import HomepageSectionUnrealizedPnlRow, {
  type HomepageUnrealizedPnlTone,
} from '../../components/HomepageSectionUnrealizedPnlRow';

const MAX_ITEMS = 5;
const MAX_TRENDING_MARKETS = 5;
const HOMEPAGE_THROTTLE_MS = 5000;

interface UsePerpsTrendingCarouselDataArgs {
  skipInitialFetch?: boolean;
}

const usePerpsNavigationHandlers = () => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);

  const navigateToTutorialOrScreen = useCallback(
    (screen: string, params: Record<string, unknown>) => {
      if (isFirstTimePerpsUser) {
        navigation.navigate(Routes.PERPS.TUTORIAL, {
          source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
          redirectScreen: screen,
          redirectParams: params,
        });
      } else {
        navigation.navigate(Routes.PERPS.ROOT, { screen, params });
      }
    },
    [isFirstTimePerpsUser, navigation],
  );

  const handleViewAllPerps = useCallback(() => {
    navigateToTutorialOrScreen(Routes.PERPS.PERPS_HOME, {
      source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
    });
  }, [navigateToTutorialOrScreen]);

  const handleViewMorePerps = useCallback(() => {
    navigateToTutorialOrScreen(Routes.PERPS.MARKET_LIST, {
      source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
    });
  }, [navigateToTutorialOrScreen]);

  const handleTilePress = useCallback(
    (market: PerpsMarketData) => {
      navigateToTutorialOrScreen(Routes.PERPS.MARKET_DETAILS, {
        market,
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      });
    },
    [navigateToTutorialOrScreen],
  );

  return {
    navigateToTutorialOrScreen,
    handleViewAllPerps,
    handleViewMorePerps,
    handleTilePress,
  };
};

const usePerpsTrendingCarouselData = ({
  skipInitialFetch = false,
}: UsePerpsTrendingCarouselDataArgs) => {
  const { markets, isLoading: marketsLoading } = usePerpsMarkets({
    skipInitialFetch,
  });
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);

  const safeWatchlistSymbols = useMemo(
    () => watchlistSymbols ?? [],
    [watchlistSymbols],
  );

  const watchlistMarkets = useMemo(() => {
    if (markets.length === 0 || safeWatchlistSymbols.length === 0) return [];
    const marketBySymbol = new Map(markets.map((m) => [m.symbol, m]));
    return safeWatchlistSymbols
      .map((sym) => marketBySymbol.get(sym))
      .filter((m): m is PerpsMarketDataWithVolumeNumber => m != null);
  }, [markets, safeWatchlistSymbols]);

  const trendingMarkets = useMemo(() => {
    if (markets.length === 0) return [];
    const wlSet = new Set(watchlistMarkets.map((m) => m.symbol));
    return filterAndSortMarkets({
      marketData: markets,
      showZeroVolume: false,
    })
      .filter((m) => !wlSet.has(m.symbol))
      .slice(0, Math.max(0, MAX_TRENDING_MARKETS - watchlistMarkets.length));
  }, [markets, watchlistMarkets]);

  const allCarouselMarkets = useMemo(
    () =>
      [...(watchlistMarkets ?? []), ...(trendingMarkets ?? [])].slice(
        0,
        MAX_TRENDING_MARKETS,
      ),
    [watchlistMarkets, trendingMarkets],
  );

  const watchlistSymbolSet = useMemo(
    () => new Set((watchlistMarkets ?? []).map((m) => m.symbol)),
    [watchlistMarkets],
  );

  return {
    markets,
    marketsLoading,
    allCarouselMarkets,
    watchlistSymbolSet,
  };
};

interface PerpsTrendingCarouselProps {
  markets: PerpsMarketDataWithVolumeNumber[];
  watchlistSymbolSet: Set<string>;
  sparklines: Record<string, number[] | undefined>;
  onPressMarket: (market: PerpsMarketData) => void;
  onPressViewMore: () => void;
}

const PerpsTrendingCarousel = ({
  markets,
  watchlistSymbolSet,
  sparklines,
  onPressMarket,
  onPressViewMore,
}: PerpsTrendingCarouselProps) => {
  const tw = useTailwind();
  if (markets.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('px-4 gap-2.5')}
      testID="homepage-trending-perps-carousel"
    >
      {markets.map((market) => (
        <PerpsMarketTileCard
          key={market.symbol}
          market={market}
          sparklineData={sparklines[market.symbol]}
          showFavoriteTag={watchlistSymbolSet.has(market.symbol)}
          onPress={onPressMarket}
        />
      ))}
      <ViewMoreCard
        onPress={onPressViewMore}
        twClassName="w-[180px] flex-1"
        testID="perps-view-more-card"
      />
    </ScrollView>
  );
};

/**
 * PerpsSection — single "Perpetuals" section on the homepage.
 *
 * Shows open positions + limit orders when the user has any,
 * otherwise shows a trending markets tile carousel with sparkline charts.
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
    },
    ref,
  ) => {
    const sectionViewRef = useRef<View>(null);
    const title = titleOverride ?? strings('homepage.sections.perpetuals');
    const analyticsName = sectionNameOverride ?? HomeSectionNames.PERPS;
    const isPositionsOnly = mode === 'positions-only';
    const shouldLoadMarkets = !isPositionsOnly;
    const { error: connectionError, reconnectWithNewContext } =
      usePerpsConnection();
    const { track } = usePerpsEventTracking();
    const privacyMode = useSelector(selectPrivacyMode);
    const {
      navigateToTutorialOrScreen,
      handleViewAllPerps,
      handleViewMorePerps,
      handleTilePress,
    } = usePerpsNavigationHandlers();

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

    const { markets, marketsLoading, allCarouselMarkets, watchlistSymbolSet } =
      usePerpsTrendingCarouselData({
        skipInitialFetch: !shouldLoadMarkets,
      });

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
    const hasFilledPositions = positions.length > 0;

    // When user has no positions/orders, keep skeleton visible until markets load.
    const pendingTrending = !showSkeleton && !hasItems && marketsLoading;
    const showTrending = !showSkeleton && !hasItems && !marketsLoading;
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
          refreshSparklines();
        },
      }),
      [connectionError, reconnectWithNewContext, refreshSparklines],
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
        const market = markets.find((m) => m.symbol === position.symbol);
        navigateToTutorialOrScreen(Routes.PERPS.MARKET_DETAILS, {
          market: market ?? {
            symbol: position.symbol,
            maxLeverage: position.maxLeverage,
          },
          initialTab: 'position',
          source: 'section_position',
        });
      },
      [navigateToTutorialOrScreen, markets, track],
    );

    // Pass null while loading so the hook uses the immediate-fire path and
    // does not fire from viewport visibility with stale itemCount/isEmpty.
    // positions-only: never wait on market/trending data — analytics for empty
    // sections must not block on unrelated REST market loads (see pendingTrending).
    const isLoadingSection = isPositionsOnly
      ? showSkeleton
      : hookLoading || deferredLoading || pendingTrending;
    const willRender = isPositionsOnly
      ? !showSkeleton && hasItems
      : !isLoadingSection;

    let isEmpty: boolean;
    if (isPositionsOnly) {
      isEmpty = !hasItems;
    } else {
      // Default: empty means no positions/orders (trending/discovery may still render).
      isEmpty = !hasItems;
    }

    const positionsOnlyHidden = isPositionsOnly && !hasItems && !showSkeleton;
    const itemCount = hasItems
      ? displayPositions.length + displayOrders.length
      : 0;

    const { onLayout } = useHomeViewedEvent({
      sectionRef: willRender && !positionsOnlyHidden ? sectionViewRef : null,
      isLoading: isLoadingSection,
      sectionName: analyticsName,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty,
      itemCount,
    });

    // positions-only: hide when empty before connection error UI (WS failure must not show error for empty section)
    if (isPositionsOnly && !hasItems && !showSkeleton) {
      return null;
    }

    if (connectionError) {
      return (
        <View ref={sectionViewRef} onLayout={onLayout}>
          <Box gap={3}>
            <SectionHeader title={title} onPress={handleViewAllPerps} />
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

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box gap={3}>
          <Box gap={1}>
            <SectionHeader title={title} onPress={handleViewAllPerps} />
            {showHomepageUnrealizedPnl && (
              <HomepageSectionUnrealizedPnlRow
                isLoading={perpsAccountLoading}
                valueText={homepageUnrealizedPnl?.valueText}
                tone={homepageUnrealizedPnl?.tone ?? 'neutral'}
                label={strings('perps.unrealized_pnl')}
                testID="homepage-perps-unrealized-pnl"
              />
            )}
          </Box>
          {showSkeleton || pendingTrending ? (
            <SectionRow>
              <PerpsPositionSkeleton />
            </SectionRow>
          ) : hasItems ? (
            <SectionRow>
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
            </SectionRow>
          ) : (
            <PerpsTrendingCarousel
              markets={allCarouselMarkets}
              watchlistSymbolSet={watchlistSymbolSet}
              sparklines={sparklines}
              onPressMarket={handleTilePress}
              onPressViewMore={handleViewMorePerps}
            />
          )}
        </Box>
      </View>
    );
  },
);

const PerpsSectionTrendingOnly = forwardRef<
  SectionRefreshHandle,
  PerpsSectionProps
>(
  (
    {
      sectionIndex,
      totalSectionsLoaded,
      sectionName: sectionNameOverride,
      titleOverride,
    },
    ref,
  ) => {
    const sectionViewRef = useRef<View>(null);
    const title = titleOverride ?? strings('homepage.sections.perpetuals');
    const analyticsName = sectionNameOverride ?? HomeSectionNames.PERPS;
    const { handleViewAllPerps, handleViewMorePerps, handleTilePress } =
      usePerpsNavigationHandlers();
    const { marketsLoading, allCarouselMarkets, watchlistSymbolSet } =
      usePerpsTrendingCarouselData({});
    const carouselSymbols = useMemo(
      () => allCarouselMarkets.map((m) => m.symbol),
      [allCarouselMarkets],
    );
    const { sparklines, refresh: refreshSparklines } =
      useHomepageSparklines(carouselSymbols);

    useImperativeHandle(
      ref,
      () => ({
        refresh: async () => {
          refreshSparklines();
        },
      }),
      [refreshSparklines],
    );

    const itemCount = allCarouselMarkets.length;
    const { onLayout } = useHomeViewedEvent({
      sectionRef: !marketsLoading && itemCount > 0 ? sectionViewRef : null,
      isLoading: marketsLoading,
      sectionName: analyticsName,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: itemCount === 0,
      itemCount,
    });

    if (!marketsLoading && itemCount === 0) {
      return null;
    }

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box gap={3}>
          <SectionHeader title={title} onPress={handleViewAllPerps} />
          {marketsLoading ? (
            <SectionRow>
              <PerpsPositionSkeleton />
            </SectionRow>
          ) : (
            <PerpsTrendingCarousel
              markets={allCarouselMarkets}
              watchlistSymbolSet={watchlistSymbolSet}
              sparklines={sparklines}
              onPressMarket={handleTilePress}
              onPressViewMore={handleViewMorePerps}
            />
          )}
        </Box>
      </View>
    );
  },
);

export const PerpsSection = forwardRef<SectionRefreshHandle, PerpsSectionProps>(
  (props, ref) => {
    if (props.mode === 'trending-only') {
      return <PerpsSectionTrendingOnly {...props} ref={ref} />;
    }
    return <PerpsSectionMain {...props} ref={ref} />;
  },
);

export default PerpsSection;
