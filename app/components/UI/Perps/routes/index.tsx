import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import PerpsView from '../Views/PerpsView';

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
  </Stack.Navigator>
);

export { PerpsScreenStack };
