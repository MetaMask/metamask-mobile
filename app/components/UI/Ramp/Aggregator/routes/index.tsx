import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Regions from '../Views/Regions';
import Quotes from '../Views/Quotes';
import NetworkSwitcher from '../Views/NetworkSwitcher';
import GetStarted from '../Views/GetStarted';
import CheckoutWebView from '../Views/Checkout';
import BuildQuote from '../Views/BuildQuote';
import { RampType } from '../types';
import { RampSDKProvider } from '../sdk';
import { colors } from '../../../../../styles/common';
import { RootParamList } from '../../../../../util/navigation/types';

const Stack = createStackNavigator<RootParamList>();

const RampRoutes = ({ rampType }: { rampType: RampType }) => (
  <RampSDKProvider rampType={rampType}>
    <Stack.Navigator
      initialRouteName={'GetStarted'}
      screenOptions={{ headerMode: 'screen' }}
    >
      <Stack.Screen name={'GetStarted'} component={GetStarted} />
      <Stack.Screen
        name={'BuyNetworkSwitcher'}
        component={NetworkSwitcher}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen name={'BuildQuote'} component={BuildQuote} />
      <Stack.Screen
        name={'BuildQuoteHasStarted'}
        component={BuildQuote}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name={'Quotes'}
        component={Quotes}
        options={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.transparent },
          animationEnabled: false,
          gestureEnabled: false,
          detachPreviousScreen: false,
        }}
      />
      <Stack.Screen name={'Checkout'} component={CheckoutWebView} />
      <Stack.Screen name={'Region'} component={Regions} />
      <Stack.Screen
        name={'RegionHasStarted'}
        component={Regions}
        options={{ animationEnabled: false }}
      />
    </Stack.Navigator>
  </RampSDKProvider>
);

export default RampRoutes;
