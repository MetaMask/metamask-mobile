import React from 'react';
import {
  createStackNavigator,
  type StackNavigationOptions,
} from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import MoneyHomeView from '../Views/MoneyHomeView';
import { Confirm } from '../../../Views/confirmations/components/confirm';

const Stack = createStackNavigator();
const MoneyAccountStack = createStackNavigator();

const MoneyScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.MONEY.HOME}
      component={MoneyHomeView}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const getMoneyAccountConfirmationScreenOptions =
  (): StackNavigationOptions => ({
    headerLeft: () => null,
    headerShown: true,
    title: '',
  });

const MoneyAccountScreenStack = () => (
  <MoneyAccountStack.Navigator>
    <MoneyAccountStack.Screen
      name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
      component={Confirm}
      options={getMoneyAccountConfirmationScreenOptions}
    />
    <MoneyAccountStack.Screen
      name={Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER}
      component={Confirm}
      options={{ headerShown: false }}
    />
  </MoneyAccountStack.Navigator>
);

export { MoneyScreenStack, MoneyAccountScreenStack };
