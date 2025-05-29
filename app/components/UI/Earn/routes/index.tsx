import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import Routes from '../../../../constants/navigation/Routes';
import { Confirm as RedesignedConfirm } from '../../../Views/confirmations/components/confirm';
import EarnLendingDepositConfirmationView from '../../Earn/Views/EarnLendingDepositConfirmationView';

const Stack = createStackNavigator();

const EarnScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.EARN.LENDING_DEPOSIT_CONFIRMATION}
      component={EarnLendingDepositConfirmationView}
    />
    <Stack.Screen
      name={Routes.STANDALONE_CONFIRMATIONS.STABLECOIN_LENDING_DEPOSIT}
      component={RedesignedConfirm}
    />
  </Stack.Navigator>
);

export { EarnScreenStack };
