import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import EarnLendingDepositConfirmationView from '../../Earn/Views/EarnLendingDepositConfirmationView';
import EarnLendingWithdrawalConfirmationView from '../Views/EarnLendingWithdrawalConfirmationView';

const Stack = createStackNavigator();

const EarnScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.EARN.LENDING_DEPOSIT_CONFIRMATION}
      component={EarnLendingDepositConfirmationView}
    />
    <Stack.Screen
      name={Routes.EARN.LENDING_WITHDRAWAL_CONFIRMATION}
      component={EarnLendingWithdrawalConfirmationView}
    />
  </Stack.Navigator>
);

export { EarnScreenStack };
