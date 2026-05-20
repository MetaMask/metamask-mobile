import '../mocks';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import { RampSDKProvider } from '../../../app/components/UI/Ramp/Aggregator/sdk';
import BuildQuote from '../../../app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote';
import PaymentMethodSelectorModal from '../../../app/components/UI/Ramp/Aggregator/components/PaymentMethodSelectorModal';
import TokenSelectModal from '../../../app/components/UI/Ramp/Aggregator/components/TokenSelectModal/TokenSelectModal';
import FiatSelectorModal from '../../../app/components/UI/Ramp/Aggregator/components/FiatSelectorModal';
import RegionSelectorModal from '../../../app/components/UI/Ramp/Aggregator/components/RegionSelectorModal';
import { RampType } from '../../../app/components/UI/Ramp/Aggregator/types';
import { initialStateRamps } from '../presets/ramps';

interface RenderBuildQuoteViewOptions {
  rampType?: RampType;
  overrides?: DeepPartial<RootState>;
  initialParams?: Record<string, unknown>;
}

/**
 * Renders the Aggregator BuildQuote screen wrapped in RampSDKProvider.
 * Defaults to sell mode to match the deeplink-to-sell regression coverage.
 *
 * Requires setupRampSdkApiMock() to be called in beforeEach so the
 * SDK's HTTP initialisation calls are intercepted.
 */
export function renderBuildQuoteView(
  options: RenderBuildQuoteViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { rampType = RampType.SELL, overrides, initialParams } = options;

  const builder = initialStateRamps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  const BQWithProvider = () =>
    React.createElement(
      RampSDKProvider,
      { rampType },
      React.createElement(BuildQuote),
    );

  return renderComponentViewScreen(
    BQWithProvider,
    { name: Routes.RAMP.BUILD_QUOTE },
    { state },
    initialParams,
  );
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

/**
 * Renders Aggregator BuildQuote with the Ramp modal stack registered.
 * Use this when a test presses BuildQuote controls that navigate to token,
 * fiat, region, or payment method selectors and expects context state to update.
 */
export function renderBuildQuoteWithRoutes(
  options: RenderBuildQuoteViewOptions = {},
): ReturnType<typeof renderWithProvider> {
  const { rampType = RampType.BUY, overrides, initialParams } = options;

  const builder = initialStateRamps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  const RootStack = createStackNavigator();
  const MainStack = createStackNavigator();
  const ModalsStack = createStackNavigator();

  const MainRoutes = () =>
    React.createElement(
      MainStack.Navigator,
      {
        initialRouteName: Routes.RAMP.BUILD_QUOTE,
        screenOptions: { headerShown: false },
      },
      React.createElement(MainStack.Screen, {
        name: Routes.RAMP.BUILD_QUOTE,
        component: BuildQuote,
        initialParams,
      }),
    );

  const RampModalsRoutes = () =>
    React.createElement(
      ModalsStack.Navigator,
      { screenOptions: { headerShown: false } },
      React.createElement(ModalsStack.Screen, {
        name: Routes.RAMP.MODALS.TOKEN_SELECTOR,
        component: TokenSelectModal,
      }),
      React.createElement(ModalsStack.Screen, {
        name: Routes.RAMP.MODALS.PAYMENT_METHOD_SELECTOR,
        component: PaymentMethodSelectorModal,
      }),
      React.createElement(ModalsStack.Screen, {
        name: Routes.RAMP.MODALS.FIAT_SELECTOR,
        component: FiatSelectorModal,
      }),
      React.createElement(ModalsStack.Screen, {
        name: Routes.RAMP.MODALS.REGION_SELECTOR,
        component: RegionSelectorModal,
      }),
    );

  const stackTree = React.createElement(
    QueryClientProvider,
    { client: createQueryClient() },
    React.createElement(
      RampSDKProvider,
      { rampType },
      React.createElement(
        RootStack.Navigator,
        {
          initialRouteName: Routes.RAMP.ID,
          screenOptions: { headerShown: false },
        },
        React.createElement(RootStack.Screen, {
          name: Routes.RAMP.ID,
          component: MainRoutes,
        }),
        React.createElement(RootStack.Screen, {
          name: Routes.RAMP.MODALS.ID,
          component: RampModalsRoutes,
        }),
      ),
    ),
  );

  return renderWithProvider(stackTree, { state });
}
