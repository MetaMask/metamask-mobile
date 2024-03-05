import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Regions from '../Views/Regions';
import Quotes from '../Views/Quotes';
import PaymentMethods from '../Views/PaymentMethods';
import NetworkSwitcher from '../Views/NetworkSwitcher';
import GetStarted from '../Views/GetStarted';
import CheckoutWebView from '../Views/Checkout';
import BuildQuote from '../Views/BuildQuote';
import { RampType } from '../types';
import { RampSDKProvider } from '../sdk';
import Routes from '../../../../constants/navigation/Routes';
import { colors } from './../../../../styles/common';
const Stack = createStackNavigator();

const RampRoutes = ({ rampType }: { rampType: RampType }) => (
  <RampSDKProvider rampType={rampType}>
    <Stack.Navigator initialRouteName={Routes.RAMP.GET_STARTED}>
      <Stack.Screen name={Routes.RAMP.GET_STARTED} component={GetStarted} />
      <Stack.Screen
        name={Routes.RAMP.NETWORK_SWITCHER}
        component={NetworkSwitcher}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name={Routes.RAMP.PAYMENT_METHOD}
        component={PaymentMethods}
      />
      <Stack.Screen
        name={Routes.RAMP.PAYMENT_METHOD_HAS_STARTED}
        component={PaymentMethods}
        options={{ animationEnabled: false }}
      />
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
  </RampSDKProvider>
);

export default RampRoutes;
