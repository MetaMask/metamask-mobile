import {
  Box,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  type OrderType,
} from '@metamask/perps-controller';
import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';
import LivePriceHeader from '../../components/LivePriceDisplay/LivePriceHeader';
import PerpsOrderTypeBottomSheetView from '../../components/PerpsOrderTypeBottomSheet/PerpsOrderTypeBottomSheetView';
import PerpsProMarketStatsBar from '../../components/PerpsProMarketStatsBar';
import { usePerpsLivePrices } from '../../hooks/stream';
import type { PerpsStackParamList } from '../../types/navigation';
import PerpsProChartPanel from './components/PerpsProChartPanel';
import PerpsProMarketHeader from './components/PerpsProMarketHeader';
import PerpsProMarketLayout from './components/PerpsProMarketLayout';
import PerpsProMarketSummary from './components/PerpsProMarketSummary';
import PerpsProOrderBookPanel from './components/PerpsProOrderBookPanel';
import PerpsProOrderFormPanel from './components/PerpsProOrderFormPanel';
import PerpsProPositionsPanel from './components/PerpsProPositionsPanel';
import { createStyles } from './PerpsProMarketView.styles';

/**
 * Pro-mode replacement for `PerpsMarketDetailsView`.
 *
 * Lays out the full Pro trading screen (header, chart, stats bar, two-column
 * order form / order book, and positions/orders section). The order book
 * column is live: raw mid/spread on the shared controller socket plus a
 * server-aggregated ladder on a dedicated AggregatedOrderBookConnection
 * (same dual-stream approach as Extension).
 */
const PerpsProMarketView = () => {
  const { styles } = useStyles(createStyles, {});
  const route =
    useRoute<RouteProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const market = route.params?.market;
  // Live price feed for the header row. Subscribed unconditionally (empty array
  // when the symbol is missing) so hook order stays stable across the early
  // return below. LivePriceHeader self-subscribes for the 24h % change.
  const livePrices = usePerpsLivePrices({
    symbols: market?.symbol ? [market.symbol] : [],
    throttleMs: 1000,
  });
  const [isOrderBookCollapsed, setIsOrderBookCollapsed] = useState(false);

  const handleCollapseOrderBook = useCallback(() => {
    setIsOrderBookCollapsed(true);
  }, []);

  const handleExpandOrderBook = useCallback(() => {
    setIsOrderBookCollapsed(false);
  }, []);

  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [isOrderTypeSheetVisible, setIsOrderTypeSheetVisible] = useState(false);

  const handleOrderTypeButtonPress = useCallback(() => {
    setIsOrderTypeSheetVisible(true);
  }, []);

  const handleOrderTypeSheetClose = useCallback(() => {
    setIsOrderTypeSheetVisible(false);
  }, []);

  const handleOrderTypeSelect = useCallback((newOrderType: OrderType) => {
    setOrderType(newOrderType);
    setIsOrderTypeSheetVisible(false);
  }, []);

  if (!market?.symbol) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <Box
          twClassName="flex-1 items-center justify-center px-4"
          testID={PerpsProMarketViewSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
            {strings('perps.market.details.error_message')}
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  const symbol = getPerpsDisplaySymbol(market.symbol);
  const marketPrice = (() => {
    if (!market.price) {
      return undefined;
    }
    const cleaned = market.price.replace(/[$,]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  })();

  // Prefer the live streamed price, fall back to the static route price so the
  // header shows something immediately before the first tick arrives.
  const livePrice = (() => {
    const raw = market.symbol ? livePrices[market.symbol]?.price : undefined;
    const parsed = raw ? Number.parseFloat(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  })();
  const currentPrice = livePrice ?? marketPrice ?? 0;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom', 'left', 'right']}
      testID={PerpsProMarketViewSelectorsIDs.CONTAINER}
    >
      <PerpsProMarketHeader symbol={symbol} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID={PerpsProMarketViewSelectorsIDs.SCROLL_VIEW}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <PerpsProMarketSummary />
        <PerpsProChartPanel />
        {/* Price + 24h change row, reusing the same LivePriceHeader/size combo
            as the lite market details view, sitting directly above the stats
            bar per the Figma "Token Info" section. */}
        <Box
          twClassName="px-4 pb-2"
          testID={PerpsProMarketViewSelectorsIDs.PRICE_HEADER}
        >
          <LivePriceHeader
            symbol={market.symbol}
            testIDPrice={PerpsProMarketViewSelectorsIDs.PRICE}
            testIDChange={PerpsProMarketViewSelectorsIDs.PRICE_CHANGE}
            currentPrice={currentPrice}
            size="large"
          />
        </Box>
        <PerpsProMarketStatsBar
          symbol={market.symbol}
          nextFundingTime={market.nextFundingTime}
          fundingIntervalHours={market.fundingIntervalHours}
        />
        <PerpsProMarketLayout
          isOrderBookCollapsed={isOrderBookCollapsed}
          onExpandOrderBook={handleExpandOrderBook}
          orderForm={
            <PerpsProOrderFormPanel
              orderType={orderType}
              onOrderTypeButtonPress={handleOrderTypeButtonPress}
            />
          }
          orderBook={
            <PerpsProOrderBookPanel
              symbol={market.symbol}
              marketPrice={marketPrice}
              onCollapse={handleCollapseOrderBook}
            />
          }
        />
        <SectionDivider />
        <PerpsProPositionsPanel />
      </ScrollView>
      <PerpsOrderTypeBottomSheetView
        isVisible={isOrderTypeSheetVisible}
        onClose={handleOrderTypeSheetClose}
        onSelect={handleOrderTypeSelect}
        currentOrderType={orderType}
        title={strings('perps.pro_order_form.choose_order_type')}
        showSelectedIcon
      />
    </SafeAreaView>
  );
};

export default PerpsProMarketView;
