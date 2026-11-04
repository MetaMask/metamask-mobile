import React, { useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';

import { useFloatingTabBarInset } from '../../../../component-library/components/Navigation/TabBarFloating';
import { BridgeScreenStack } from '../../../UI/Bridge/routes';
import PerpsScreenStack from '../../../UI/Perps/routes';
import { PredictRoot } from '../../../UI/PredictNext';
import { CollectiblesView } from '../../../Views/Collectibles/CollectiblesView';
import ContextualSectionPlaceholder from './ContextualSectionPlaceholder';
import { useContextualNavState } from './contextualSection';
import { useTradingHubAvailability } from './useTradingHubAvailability';

const PAGE: ViewStyle = { flex: 1 };

/**
 * Footer destinations render here, in the Trade tab, so they replace the
 * page in place. Screens opened inside a hub still push on that hub's stack.
 * These roots are not root-stack pushes, so they have no header back button.
 */
const TradeDashboard = () => {
  const { section, tab } = useContextualNavState();
  const availability = useTradingHubAvailability();
  const tabBarInset = useFloatingTabBarInset();
  const dashboardStyle = useMemo(
    () => ({ paddingBottom: tabBarInset }),
    [tabBarInset],
  );

  if (section === 'collectibles') {
    return (
      <View style={PAGE} testID="trade-inplace-collectibles">
        <CollectiblesView />
      </View>
    );
  }

  if (section === 'trading' && tab === 'swap') {
    return (
      <View style={PAGE} testID="trade-inplace-swap">
        <BridgeScreenStack />
      </View>
    );
  }

  if (section === 'trading' && tab === 'perps') {
    return (
      <View style={PAGE} testID="trade-inplace-perps">
        {availability.perps ? (
          <PerpsScreenStack />
        ) : (
          <ContextualSectionPlaceholder title="Perps" />
        )}
      </View>
    );
  }

  if (section === 'trading' && tab === 'predictions') {
    return (
      <View style={PAGE} testID="trade-inplace-predictions">
        {availability.predictions ? (
          <PredictRoot />
        ) : (
          <ContextualSectionPlaceholder title="Predictions" />
        )}
      </View>
    );
  }

  return (
    <Box
      twClassName="flex-1 bg-default"
      padding={4}
      style={dashboardStyle}
      testID="trade-dashboard"
    >
      <Text variant={TextVariant.HeadingLg} accessibilityRole="header">
        Trade
      </Text>
    </Box>
  );
};

export default TradeDashboard;
