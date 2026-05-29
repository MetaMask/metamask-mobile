import '../mocks';
import React from 'react';
import { Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import { AccessRestrictedProvider } from '../../../app/components/UI/Compliance';
import MarketInsightsView from '../../../app/components/UI/MarketInsights/Views/MarketInsightsView/MarketInsightsView';
import { BuildQuoteSelectors } from '../../../app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote.testIds';
import {
  initialStateMarketInsightsView,
  fiatOrdersRampRoutingSupported,
} from '../presets/marketInsightsView';

const RootStack = createStackNavigator();
const BridgeInnerStack = createStackNavigator();
const RampMainStack = createStackNavigator();
const RampOuterStack = createStackNavigator();

const BridgeViewProbe = (): React.ReactElement => (
  <Text testID="route-BridgeView">BridgeView</Text>
);

const TokenSelectionProbe = (): React.ReactElement => (
  <Text testID="route-RampTokenSelectionInner">TokenSelection</Text>
);

const AmountInputProbe = (): React.ReactElement => (
  <Text testID={BuildQuoteSelectors.CONTINUE_BUTTON}>Continue</Text>
);

function BridgeNavigator(): React.ReactElement {
  return (
    <BridgeInnerStack.Navigator screenOptions={{ headerShown: false }}>
      <BridgeInnerStack.Screen
        name={Routes.BRIDGE.BRIDGE_VIEW}
        component={BridgeViewProbe}
      />
    </BridgeInnerStack.Navigator>
  );
}

function RampMainRoutes(): React.ReactElement {
  return (
    <RampMainStack.Navigator
      initialRouteName={Routes.RAMP.TOKEN_SELECTION}
      screenOptions={{ headerShown: false }}
    >
      <RampMainStack.Screen
        name={Routes.RAMP.TOKEN_SELECTION}
        component={TokenSelectionProbe}
      />
      <RampMainStack.Screen
        name={Routes.RAMP.AMOUNT_INPUT}
        component={AmountInputProbe}
      />
    </RampMainStack.Navigator>
  );
}

function RampNavigator(): React.ReactElement {
  return (
    <RampOuterStack.Navigator
      initialRouteName={Routes.RAMP.TOKEN_SELECTION}
      screenOptions={{ headerShown: false }}
    >
      <RampOuterStack.Screen
        name={Routes.RAMP.TOKEN_SELECTION}
        component={RampMainRoutes}
      />
    </RampOuterStack.Navigator>
  );
}

interface RenderMarketInsightsViewOptions {
  overrides?: DeepPartial<RootState>;
  initialParams?: Record<string, unknown>;
}

/**
 * Renders MarketInsightsView with Bridge + Ramps stacks registered so swap/buy navigation can be asserted.
 */
export function renderMarketInsightsViewWithNavigation(
  options: RenderMarketInsightsViewOptions = {},
) {
  const { overrides, initialParams } = options;

  const builder = initialStateMarketInsightsView();
  builder.withOverrides(fiatOrdersRampRoutingSupported);
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  const stackTree = (
    <AccessRestrictedProvider>
      <RootStack.Navigator
        initialRouteName={Routes.MARKET_INSIGHTS.VIEW}
        screenOptions={{ headerShown: false }}
      >
        <RootStack.Screen
          name={Routes.MARKET_INSIGHTS.VIEW}
          component={MarketInsightsView as unknown as React.ComponentType}
          initialParams={initialParams}
        />
        <RootStack.Screen
          name={Routes.BRIDGE.ROOT}
          component={BridgeNavigator}
        />
        <RootStack.Screen
          name={Routes.RAMP.TOKEN_SELECTION}
          component={RampNavigator}
        />
      </RootStack.Navigator>
    </AccessRestrictedProvider>
  );

  return renderWithProvider(stackTree, { state });
}
