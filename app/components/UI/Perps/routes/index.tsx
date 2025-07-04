import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import PerpsView from '../Views/PerpsView';
import PerpsMarketsList from '../Views/PerpMarketsList';

const Stack = createStackNavigator();

const PerpsScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.PERPS.TRADING_VIEW}
      component={PerpsView}
      options={{
        title: 'Perps Trading',
        headerShown: true,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.MODALS.PERP_MARKETS_MODAL}
      component={PerpsView}
      options={{
        title: 'Perps Trading',
        headerShown: true,
      }}
    />
  </Stack.Navigator>
);

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

const ModalStack = createStackNavigator();

const PerpsModalStack = () => (
  <ModalStack.Navigator mode="modal" screenOptions={clearStackNavigatorOptions}>
    <ModalStack.Screen
      name={Routes.PERPS.MODALS.PERP_MARKETS_MODAL}
      component={PerpsMarketsList}
      options={{ headerShown: false }}
    />
  </ModalStack.Navigator>
);

export { PerpsScreenStack, PerpsModalStack };
