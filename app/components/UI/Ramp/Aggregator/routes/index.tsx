import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Regions from '../Views/Regions';
import Quotes from '../Views/Quotes';
import GetStarted from '../Views/GetStarted';
import CheckoutWebView from '../Views/Checkout';
import BuildQuote from '../Views/BuildQuote';
import TokenSelectModal from '../components/TokenSelectModal/TokenSelectModal';
import PaymentMethodSelectorModal from '../components/PaymentMethodSelectorModal';
import FiatSelectorModal from '../components/FiatSelectorModal';

import { RampType } from '../types';
import { RampSDKProvider } from '../sdk';
import Routes from '../../../../../constants/navigation/Routes';
import { colors } from '../../../../../styles/common';
import IncompatibleAccountTokenModal from '../components/IncompatibleAccountTokenModal';

const Stack = createStackNavigator();
const ModalsStack = createStackNavigator();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: colors.transparent },
  animationEnabled: false,
};

const MainRoutes = () => (
  <Stack.Navigator
    initialRouteName={Routes.RAMP.GET_STARTED}
    headerMode="screen"
  >
    <Stack.Screen name={Routes.RAMP.GET_STARTED} component={GetStarted} />
    <Stack.Screen name={Routes.RAMP.BUILD_QUOTE} component={BuildQuote} />
    <Stack.Screen
      name={Routes.RAMP.BUILD_QUOTE_HAS_STARTED}
      component={BuildQuote}
      options={{ animationEnabled: false }}
    />
    <Stack.Screen
      name={Routes.RAMP.QUOTES}
      component={Quotes}
      options={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.transparent },
        animationEnabled: false,
        gestureEnabled: false,
        detachPreviousScreen: false,
      }}
    />
    <Stack.Screen name={Routes.RAMP.CHECKOUT} component={CheckoutWebView} />
    <Stack.Screen name={Routes.RAMP.REGION} component={Regions} />
    <Stack.Screen
      name={Routes.RAMP.REGION_HAS_STARTED}
      component={Regions}
      options={{ animationEnabled: false }}
    />
  </Stack.Navigator>
);

const RampModalsRoutes = () => (
  <ModalsStack.Navigator
    mode="modal"
    screenOptions={clearStackNavigatorOptions}
  >
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.TOKEN_SELECTOR}
      component={TokenSelectModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.PAYMENT_METHOD_SELECTOR}
      component={PaymentMethodSelectorModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.FIAT_SELECTOR}
      component={FiatSelectorModal}
    />

    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.INCOMPATIBLE_ACCOUNT_TOKEN}
      component={IncompatibleAccountTokenModal}
    />
  </ModalsStack.Navigator>
);

const RampRoutes = ({ rampType }: { rampType: RampType }) => (
  <RampSDKProvider rampType={rampType}>
    <Stack.Navigator
      initialRouteName={Routes.RAMP.GET_STARTED}
      headerMode="none"
    >
      <Stack.Screen name={Routes.RAMP.GET_STARTED} component={MainRoutes} />
      <Stack.Screen
        name={Routes.RAMP.MODALS.ID}
        component={RampModalsRoutes}
        options={{
          ...clearStackNavigatorOptions,
          detachPreviousScreen: false,
        }}
      />
    </Stack.Navigator>
  </RampSDKProvider>
);

export default RampRoutes;
