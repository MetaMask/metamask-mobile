import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import EarnLendingDepositConfirmationView from '../../Earn/Views/EarnLendingDepositConfirmationView';

const Stack = createStackNavigator();

const EarnScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.EARN.LENDING_DEPOSIT_CONFIRMATION}
      component={EarnLendingDepositConfirmationView}
    />
  </Stack.Navigator>
);

export { EarnScreenStack };
