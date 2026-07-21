import { SectionDivider } from '@metamask/design-system-react-native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { useRoute, type RouteProp } from '@react-navigation/native';
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles } from '../../../../../component-library/hooks';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';
import PerpsProChartPanel from './components/PerpsProChartPanel';
import PerpsProMarketHeader from './components/PerpsProMarketHeader';
import PerpsProMarketLayout from './components/PerpsProMarketLayout';
import PerpsProOrderBookPanel from './components/PerpsProOrderBookPanel';
import PerpsProOrderFormPanel from './components/PerpsProOrderFormPanel';
import PerpsProPositionsPanel from './components/PerpsProPositionsPanel';
import PerpsProStatsBar from './components/PerpsProStatsBar';
import { createStyles } from './PerpsProMarketView.styles';
import { DEFAULT_PRO_LAYOUT_CONFIG } from './PerpsProMarketView.types';

interface PerpsProMarketRouteParams {
  market?: PerpsMarketData;
}

/**
 * Pro-mode replacement for `PerpsMarketDetailsView`.
 *
 * Scaffold only: lays out the full Pro trading screen (header, chart, stats
 * bar, two-column order form / order book, and positions/orders section) as
 * placeholder containers matching Figma node 10041:12979, so later tickets
 * (TAT-3555/TAT-3556/TAT-3551) can drop real panels into existing slots.
 */
const PerpsProMarketView = () => {
  const { styles } = useStyles(createStyles, {});
  const route =
    useRoute<RouteProp<{ params: PerpsProMarketRouteParams }, 'params'>>();
  const symbol = route.params?.market?.symbol;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
      testID={PerpsProMarketViewSelectorsIDs.CONTAINER}
    >
      <PerpsProMarketHeader symbol={symbol} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID={PerpsProMarketViewSelectorsIDs.SCROLL_VIEW}
      >
        <PerpsProChartPanel />
        <PerpsProStatsBar />
        <PerpsProMarketLayout
          config={DEFAULT_PRO_LAYOUT_CONFIG}
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
