import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import MoneyHomeView from '../Views/MoneyHomeView';

const Stack = createStackNavigator();

const MoneyScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.MONEY.HOME}
      component={MoneyHomeView}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

export { MoneyScreenStack };
