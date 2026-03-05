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
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import {
  type PerpsMarketData,
  type Position,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import type { PerpsMarketDataWithVolumeNumber } from '../../../../UI/Perps/hooks/usePerpsMarkets';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import FadingScrollContainer, {
  type ScrollRenderProps,
} from '../../components/FadingScrollContainer';
import ErrorState from '../../components/ErrorState';
import Routes from '../../../../../constants/navigation/Routes';
import {
  usePerpsLivePositions,
  usePerpsLiveOrders,
  usePerpsMarkets,
} from '../../../../UI/Perps/hooks';
import { usePerpsConnection } from '../../../../UI/Perps/hooks/usePerpsConnection';
import { filterAndSortMarkets } from '../../../../UI/Perps/utils/filterAndSortMarkets';
import { selectPerpsWatchlistMarkets } from '../../../../UI/Perps/selectors/perpsController';
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import PerpsPositionCard from '../../../../UI/Perps/components/PerpsPositionCard/PerpsPositionCard';
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

const MAX_ITEMS = 5;
const MAX_TRENDING_MARKETS = 5;
const HOMEPAGE_THROTTLE_MS = 5000;

/** Key fields that affect position card display; skip re-render if unchanged */
function positionDisplayKey(p: Position): string {
  return `${p.symbol}:${p.entryPrice ?? ''}:${p.size ?? ''}:${p.unrealizedPnl ?? ''}:${p.takeProfitPrice ?? ''}:${p.stopLossPrice ?? ''}`;
}

/**
 * Memoized wrapper so the inline onPress closure doesn't defeat React.memo
 * on PerpsPositionCard. Re-renders only when this position's display data changed.
 */
const PositionCardItem = React.memo<{
  position: Position;
  tpSlLoading: boolean;
  onPositionPress: (position: Position) => void;
}>(
  ({ position, tpSlLoading, onPositionPress }) => {
    const handlePress = useCallback(
      () => onPositionPress(position),
      [onPositionPress, position],
    );

    return (
      <PerpsPositionCard
        position={position}
        compact
        compactVariant="position"
        tpSlLoading={tpSlLoading}
        onPress={handlePress}
        testID={`perps-position-row-${position.symbol}`}
      />
    );
  },
  (prev, next) =>
    prev.tpSlLoading === next.tpSlLoading &&
    prev.onPositionPress === next.onPositionPress &&
    positionDisplayKey(prev.position) === positionDisplayKey(next.position),
);

/** Props for the content block that depends on positions/orders (isolates re-renders) */
interface PerpsSectionContentProps {
  allCarouselMarkets: PerpsMarketDataWithVolumeNumber[];
  watchlistSymbolSet: Set<string>;
  marketsLoading: boolean;
  sparklines: Record<string, number[] | undefined>;
  handleViewAllPerps: () => void;
  handlePositionPress: (position: Position) => void;
  handleTilePress: (market: PerpsMarketData) => void;
  /** For useHomeViewedEvent; when omitted, view event is not tracked */
  sectionRef?: React.RefObject<View> | null;
  sectionIndex?: number;
  totalSectionsLoaded?: number;
}

/**
 * Content subtree that owns positions/orders hooks so that position updates
 * only re-render this subtree, not the section title or parent.
 */
const PerpsSectionContent = React.memo<PerpsSectionContentProps>(
  ({
    allCarouselMarkets,
    watchlistSymbolSet,
    marketsLoading,
    sparklines,
    handleViewAllPerps,
    handlePositionPress,
    handleTilePress,
    sectionRef,
    sectionIndex,
    totalSectionsLoaded,
  }) => {
    const tw = useTailwind();

    const { positions, isInitialLoading: positionsLoading } =
      usePerpsLivePositions({
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

    // TP/SL is extracted from orders and merged into positions by the
    // subscription service. Due to the 5s throttle the merged update can be
    // delayed — positions appear first without TP/SL. If any position already
    // has TP/SL the merge is done for all of them; otherwise wait for a
    // fallback timeout (throttle interval + margin).
    const anyPositionHasTpSl = useMemo(
      () =>
        positions.some(
          (p) => p.takeProfitPrice != null || p.stopLossPrice != null,
        ),
      [positions],
    );

    const [tpSlSettled, setTpSlSettled] = useState(false);

    useEffect(() => {
      if (showSkeleton) {
        setTpSlSettled(false);
        return undefined;
      }
      if (anyPositionHasTpSl) return undefined;
      const timer = setTimeout(
        () => setTpSlSettled(true),
        HOMEPAGE_THROTTLE_MS + 500,
      );
      return () => clearTimeout(timer);
    }, [showSkeleton, anyPositionHasTpSl]);

    const tpSlReady = anyPositionHasTpSl || tpSlSettled;

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

    const pendingTrending = !showSkeleton && !hasItems && marketsLoading;

    const isLoadingSection = hookLoading || deferredLoading || pendingTrending;
    useHomeViewedEvent({
      sectionRef: sectionRef ?? null,
      isLoading: isLoadingSection,
      sectionName: HomeSectionNames.PERPS,
      sectionIndex: sectionIndex ?? -1,
      totalSectionsLoaded: totalSectionsLoaded ?? 0,
      isEmpty: !hasItems && allCarouselMarkets.length === 0,
      itemCount: hasItems ? displayPositions.length + displayOrders.length : 0,
    });

    const renderCarousel = useCallback(
      (scrollProps: ScrollRenderProps) => (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 gap-2.5')}
          testID="homepage-trending-perps-carousel"
          {...scrollProps}
        >
          {allCarouselMarkets.map((market) => (
            <PerpsMarketTileCard
              key={market.symbol}
              market={market}
              sparklineData={sparklines[market.symbol]}
              showFavoriteTag={watchlistSymbolSet.has(market.symbol)}
              onPress={handleTilePress}
            />
          ))}
          <ViewMoreCard
            onPress={handleViewAllPerps}
            twClassName="w-[180px] h-[140px]"
            activeOpacity={0.7}
            testID="perps-view-more-card"
          />
        </ScrollView>
      ),
      [
        tw,
        allCarouselMarkets,
        sparklines,
        watchlistSymbolSet,
        handleTilePress,
        handleViewAllPerps,
      ],
    );

    if (showSkeleton || pendingTrending) {
      return (
        <SectionRow>
          <PerpsPositionSkeleton />
        </SectionRow>
      );
    }

    if (hasItems) {
      return (
        <SectionRow>
          <Box testID="homepage-perps-positions">
            {displayPositions.map((position) => (
              <PositionCardItem
                key={position.symbol}
                position={position}
                tpSlLoading={!tpSlReady}
                onPositionPress={handlePositionPress}
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
      );
    }

    if (allCarouselMarkets.length > 0) {
      return <FadingScrollContainer>{renderCarousel}</FadingScrollContainer>;
    }

    return null;
  },
);

PerpsSectionContent.displayName = 'PerpsSectionContent';

/**
 * PerpsSection — single "Perpetuals" section on the homepage.
 *
 * Shows open positions + limit orders when the user has any,
 * otherwise shows a trending markets tile carousel with sparkline charts.
 *
 * Must be rendered inside PerpsConnectionProvider + PerpsStreamProvider.
 * Positions/orders live in PerpsSectionContent so throttle updates don't
 * re-render the section title.
 */
const PerpsSection = forwardRef<SectionRefreshHandle, PerpsSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const navigation =
      useNavigation<NavigationProp<PerpsNavigationParamList>>();
    const title = strings('homepage.sections.perpetuals');
    const { error: connectionError, reconnectWithNewContext } =
      usePerpsConnection();
    const { track } = usePerpsEventTracking();

    const {
      markets,
      isLoading: marketsLoading,
      refresh: refreshMarkets,
    } = usePerpsMarkets();
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
        [...watchlistMarkets, ...trendingMarkets].slice(
          0,
          MAX_TRENDING_MARKETS,
        ),
      [watchlistMarkets, trendingMarkets],
    );

    const watchlistSymbolSet = useMemo(
      () => new Set(watchlistMarkets.map((m) => m.symbol)),
      [watchlistMarkets],
    );

    const carouselSymbols = useMemo(
      () => allCarouselMarkets.map((m) => m.symbol),
      [allCarouselMarkets],
    );
    const { sparklines, refresh: refreshSparklines } =
      useHomepageSparklines(carouselSymbols);

    useFocusEffect(
      useCallback(() => {
        refreshMarkets();
      }, [refreshMarkets]),
    );

    useImperativeHandle(
      ref,
      () => ({
        refresh: async () => {
          if (connectionError) {
            await reconnectWithNewContext({ force: true });
            return;
          }
          refreshSparklines();
          await refreshMarkets();
        },
      }),
      [
        connectionError,
        reconnectWithNewContext,
        refreshSparklines,
        refreshMarkets,
      ],
    );

    const handleViewAllPerps = useCallback(() => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION },
      });
    }, [navigation]);

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
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: {
            market: market ?? {
              symbol: position.symbol,
              maxLeverage: position.maxLeverage,
            },
            initialTab: 'position',
            source: 'section_position',
          },
        });
      },
      [navigation, markets, track],
    );

    const handleTilePress = useCallback(
      (market: PerpsMarketData) => {
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: { market, source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION },
        });
      },
      [navigation],
    );

    if (connectionError) {
      return (
        <View ref={sectionViewRef}>
          <Box gap={3}>
            <SectionTitle title={title} onPress={handleViewAllPerps} />
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
      <View ref={sectionViewRef}>
        <Box gap={3}>
          <SectionTitle title={title} onPress={handleViewAllPerps} />
          <PerpsSectionContent
            allCarouselMarkets={allCarouselMarkets}
            watchlistSymbolSet={watchlistSymbolSet}
            marketsLoading={marketsLoading}
            sparklines={sparklines}
            handleViewAllPerps={handleViewAllPerps}
            handlePositionPress={handlePositionPress}
            handleTilePress={handleTilePress}
            sectionRef={sectionViewRef}
            sectionIndex={sectionIndex}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        </Box>
      </View>
    );
  },
);

export default PerpsSection;
