import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import PerpsView from '../Views/PerpsView';
import PerpsMarketListView from '../Views/PerpsMarketListView/PerpsMarketListView';

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
      name={Routes.PERPS.MARKETS_LIST}
      component={PerpsMarketListView}
      options={{
        title: 'Perps Markets',
        headerShown: false, // Component has its own header
      }}
    />
  </Stack.Navigator>
);

export { PerpsScreenStack };
