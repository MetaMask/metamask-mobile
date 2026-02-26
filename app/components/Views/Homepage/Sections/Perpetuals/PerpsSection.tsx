import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  useRef,
} from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import {
  type PerpsMarketData,
  type Position,
} from '@metamask/perps-controller';
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
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import PerpsPositionCard from '../../../../UI/Perps/components/PerpsPositionCard/PerpsPositionCard';
import PerpsCard from '../../../../UI/Perps/components/PerpsCard';
import PerpsPositionSkeleton from './components/PerpsPositionSkeleton';
import PerpsMarketTileCard from './components/PerpsMarketTileCard';
import PerpsViewMoreCard from './components/PerpsViewMoreCard';
import { useHomepageSparklines } from './hooks/useHomepageSparklines';
import { strings } from '../../../../../../locales/i18n';
import type { SectionRefreshHandle } from '../../types';
import useHomepageSectionViewedEvent, {
  HomepageSectionNames,
} from '../../hooks/useHomepageSectionViewedEvent';
import type { PerpsSectionProps } from './PerpsSectionWithProvider';

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
const PerpsSection = forwardRef<SectionRefreshHandle, PerpsSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const tw = useTailwind();
    const navigation =
      useNavigation<NavigationProp<PerpsNavigationParamList>>();
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

    const trendingMarkets = useMemo(
      () =>
        showTrending && markets.length > 0
          ? filterAndSortMarkets({
              marketData: markets,
              showZeroVolume: false,
            }).slice(0, MAX_TRENDING_MARKETS)
          : [],
      [showTrending, markets],
    );

    const trendingSymbols = useMemo(
      () => trendingMarkets.map((m) => m.symbol),
      [trendingMarkets],
    );
    const { sparklines, refresh: refreshSparklines } =
      useHomepageSparklines(trendingSymbols);

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

    useHomepageSectionViewedEvent({
      sectionRef: sectionViewRef,
      isLoading: hookLoading || deferredLoading || pendingTrending,
      sectionName: HomepageSectionNames.PERPS,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: !hasItems && trendingMarkets.length === 0,
      itemCount: hasItems ? displayPositions.length + displayOrders.length : 0,
    });

    return (
      <View ref={sectionViewRef}>
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
                    iconSize={36}
                    tpSlLoading={!tpSlReady}
                    onPress={() => handlePositionPress(position)}
                    testID={`perps-position-row-${position.symbol}`}
                  />
                ))}
                {displayOrders.map((order) => (
                  <PerpsCard
                    key={order.orderId}
                    order={order}
                    iconSize={36}
                    testID={`perps-order-row-${order.orderId}`}
                  />
                ))}
              </Box>
            </SectionRow>
          ) : trendingMarkets.length > 0 ? (
            <FadingScrollContainer>
              {(scrollProps) => (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={tw.style('px-4 gap-2.5')}
                  testID="homepage-trending-perps-carousel"
                  {...scrollProps}
                >
                  {trendingMarkets.map((market) => (
                    <PerpsMarketTileCard
                      key={market.symbol}
                      market={market}
                      sparklineData={sparklines[market.symbol]}
                      onPress={handleTilePress}
                    />
                  ))}
                  <PerpsViewMoreCard onPress={handleViewAllPerps} />
                </ScrollView>
              )}
            </FadingScrollContainer>
          ) : null}
        </Box>
      </View>
    );
  },
);

export default PerpsSection;
