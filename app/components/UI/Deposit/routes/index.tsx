import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DepositSDKProvider } from '../sdk';
import Root from '../Views/Root';
import Routes from '../../../../constants/navigation/Routes';

const Stack = createStackNavigator();

const DepositRoutes = () => (
  <DepositSDKProvider>
    <Stack.Navigator initialRouteName={Routes.DEPOSIT.ROOT}>
      <Stack.Screen name={Routes.DEPOSIT.ROOT} component={Root} />
    </Stack.Navigator>
  </DepositSDKProvider>
);

export default DepositRoutes;
