import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

const styles = StyleSheet.create({
  chart: {
    height: 344,
  },
});

/**
 * Pro-mode chart area placeholder.
 *
 * Scaffold only: empty container sized to the Figma chart height. Real chart
 * content is added by the chart capability.
 */
const PerpsProChartPanel = () => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.CHART_PANEL}
    twClassName="px-4 py-2"
  >
    <Box
      testID={PerpsProMarketViewSelectorsIDs.CHART_CONTENT}
      twClassName="rounded-xl bg-muted"
      style={styles.chart}
    />
  </Box>
);

export default PerpsProChartPanel;
