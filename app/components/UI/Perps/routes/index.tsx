import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PerpsView from '../Views/PerpsView';
import DepositAmountView from '../Views/DepositAmountView';
import DepositPreviewView from '../Views/DepositPreviewView';
import DepositProcessingView from '../Views/DepositProcessingView';
import Routes from '../../../../constants/navigation/Routes';

const Stack = createStackNavigator();

const PerpsScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.PERPS.ROOT}
      component={PerpsView}
      options={{
        title: 'Perps Trading',
        headerShown: true,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.DEPOSIT}
      component={DepositAmountView}
      options={{
        title: 'Deposit',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.DEPOSIT_PREVIEW}
      component={DepositPreviewView}
      options={{
        title: 'Deposit Preview',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.DEPOSIT_SUCCESS}
      component={DepositProcessingView}
      options={{
        title: 'Deposit Status',
        headerShown: false,
      }}
    />
  </Stack.Navigator>
);

export { PerpsScreenStack };
