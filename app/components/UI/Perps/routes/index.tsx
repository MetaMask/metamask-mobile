import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PerpsView from '../Views/PerpsView';
import PerpsDepositAmountView from '../Views/PerpsDepositAmountView';
import PerpsDepositPreviewView from '../Views/PerpsDepositPreviewView';
import PerpsDepositProcessingView from '../Views/PerpsDepositProcessingView';
import PerpsDepositSuccessView from '../Views/PerpsDepositSuccessView';
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
      component={PerpsDepositAmountView}
      options={{
        title: 'Deposit',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.DEPOSIT_PREVIEW}
      component={PerpsDepositPreviewView}
      options={{
        title: 'Deposit Preview',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.DEPOSIT_PROCESSING}
      component={PerpsDepositProcessingView}
      options={{
        title: 'Processing Deposit',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.DEPOSIT_SUCCESS}
      component={PerpsDepositSuccessView}
      options={{
        title: 'Deposit Success',
        headerShown: false,
      }}
    />
  </Stack.Navigator>
);

export { PerpsScreenStack };
