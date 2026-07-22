import {
  Box,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import { useRoute, type RouteProp } from '@react-navigation/native';
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';
import type { PerpsStackParamList } from '../../types/navigation';
import PerpsProChartPanel from './components/PerpsProChartPanel';
import PerpsProMarketHeader from './components/PerpsProMarketHeader';
import PerpsProMarketLayout from './components/PerpsProMarketLayout';
import PerpsProMarketSummary from './components/PerpsProMarketSummary';
import PerpsProOrderBookPanel from './components/PerpsProOrderBookPanel';
import PerpsProOrderFormPanel from './components/PerpsProOrderFormPanel';
import PerpsProPositionsPanel from './components/PerpsProPositionsPanel';
import PerpsProStatsBar from './components/PerpsProStatsBar';
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
      >
        <PerpsProMarketSummary />
        <PerpsProChartPanel />
        <PerpsProStatsBar />
        <PerpsProMarketLayout
          orderForm={<PerpsProOrderFormPanel />}
          orderBook={
            <PerpsProOrderBookPanel
              symbol={market.symbol}
              marketPrice={marketPrice}
            />
          }
        />
        <SectionDivider />
        <PerpsProPositionsPanel />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerpsProMarketView;
