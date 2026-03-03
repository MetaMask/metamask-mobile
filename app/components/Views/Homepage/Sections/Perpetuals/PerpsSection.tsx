import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import {
  type PerpsMarketData,
  type Position,
} from '@metamask/perps-controller';
import type { PerpsMarketDataWithVolumeNumber } from '../../../../UI/Perps/hooks/usePerpsMarkets';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import FadingScrollContainer from '../../components/FadingScrollContainer';
import Routes from '../../../../../constants/navigation/Routes';
import {
  usePerpsLivePositions,
  usePerpsLiveOrders,
  usePerpsMarkets,
} from '../../../../UI/Perps/hooks';
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

const MAX_ITEMS = 5;
const MAX_TRENDING_MARKETS = 5;
const HOMEPAGE_THROTTLE_MS = 5000;

/**
 * PerpsSection — single "Perpetuals" section on the homepage.
 *
 * Shows open positions + limit orders when the user has any,
 * otherwise shows a trending markets tile carousel with sparkline charts.
 *
 * Must be rendered inside PerpsConnectionProvider + PerpsStreamProvider.
 */
const PerpsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const title = strings('homepage.sections.perpetuals');

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

  const { markets, isLoading: marketsLoading } = usePerpsMarkets();
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);

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

  // When user has no positions/orders, keep skeleton visible until markets
  // load so the section doesn't flash empty while trending tiles are fetched.
  const pendingTrending = !showSkeleton && !hasItems && marketsLoading;
  const showTrending = !showSkeleton && !hasItems && !marketsLoading;

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
      [...watchlistMarkets, ...trendingMarkets].slice(0, MAX_TRENDING_MARKETS),
    [watchlistMarkets, trendingMarkets],
  );

  const watchlistSymbolSet = useMemo(
    () => new Set(watchlistMarkets.map((m) => m.symbol)),
    [watchlistMarkets],
  );

  const carouselSymbols = useMemo(
    () => (showTrending ? allCarouselMarkets.map((m) => m.symbol) : []),
    [showTrending, allCarouselMarkets],
  );
  const { sparklines, refresh: refreshSparklines } =
    useHomepageSparklines(carouselSymbols);

  useImperativeHandle(
    ref,
    () => ({
      refresh: () => {
        refreshSparklines();
        return Promise.resolve();
      },
    }),
    [refreshSparklines],
  );

  const handleViewAllPerps = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  }, [navigation]);

  const handlePositionPress = useCallback(
    (position: Position) => {
      const market = markets.find((m) => m.symbol === position.symbol);
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: market ?? {
            symbol: position.symbol,
            maxLeverage: position.maxLeverage,
          },
          initialTab: 'position',
        },
      });
    },
    [navigation, markets],
  );

  const handleTilePress = useCallback(
    (market: PerpsMarketData) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market },
      });
    },
    [navigation],
  );

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllPerps} />
      {showSkeleton || pendingTrending ? (
        <SectionRow>
          <PerpsPositionSkeleton />
        </SectionRow>
      ) : hasItems ? (
        <SectionRow>
          <Box testID="homepage-perps-positions">
            {displayPositions.map((position) => (
              <PerpsPositionCard
                key={position.symbol}
                position={position}
                compact
                compactVariant="position"
                tpSlLoading={!tpSlReady}
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
      ) : allCarouselMarkets.length > 0 ? (
        <FadingScrollContainer>
          {(scrollProps) => (
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
          )}
        </FadingScrollContainer>
      ) : null}
    </Box>
  );
});

export default PerpsSection;
