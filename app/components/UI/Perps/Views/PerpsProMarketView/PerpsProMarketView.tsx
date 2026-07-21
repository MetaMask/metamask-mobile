import { SectionDivider } from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import { useRoute, type RouteProp } from '@react-navigation/native';
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
 * Scaffold only: lays out the full Pro trading screen (header, chart, stats
 * bar, two-column order form / order book, and positions/orders section) as
 * placeholder containers matching Figma node 10041:12979. Each panel can be
 * populated by its owning capability without changing the top-level layout.
 */
const PerpsProMarketView = () => {
  const { styles } = useStyles(createStyles, {});
  const route =
    useRoute<RouteProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const symbol = getPerpsDisplaySymbol(route.params.market.symbol);

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
          orderBook={<PerpsProOrderBookPanel />}
        />
        <SectionDivider />
        <PerpsProPositionsPanel />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerpsProMarketView;
