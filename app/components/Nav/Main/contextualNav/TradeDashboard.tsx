import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';

import { useFloatingTabBarInset } from '../../../../component-library/components/Navigation/TabBarFloating';

/**
 * Trade tab body. The trade footer is the way into Swap, Perps, Predictions,
 * and Collectibles. This page stays blank.
 */
const TradeDashboard = () => {
  const tabBarInset = useFloatingTabBarInset();

  return (
    <Box
      twClassName="flex-1 bg-default"
      padding={4}
      style={{ paddingBottom: tabBarInset }}
      testID="trade-dashboard"
    >
      <Text variant={TextVariant.HeadingLg} accessibilityRole="header">
        Trade
      </Text>
    </Box>
  );
};

export default TradeDashboard;
