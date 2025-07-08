import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PerpsView from '../Views/PerpsView';
import PerpsOrderView from '../Views/PerpsOrderView';
import PerpsOrderSuccessView from '../Views/PerpsOrderSuccessView';
import PerpsDepositAmountView from '../Views/PerpsDepositAmountView';
import PerpsDepositPreviewView from '../Views/PerpsDepositPreviewView';
import PerpsDepositProcessingView from '../Views/PerpsDepositProcessingView';
import PerpsDepositSuccessView from '../Views/PerpsDepositSuccessView';
import PerpsPositionsView from '../Views/PerpsPositionsView';
import PerpsPositionDetailsView from '../Views/PerpsPositionDetailsView';
import PerpsOrderHistoryView from '../Views/PerpsOrderHistoryView';
import PerpsOrderDetailsView from '../Views/PerpsOrderDetailsView';
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
      name={Routes.PERPS.ORDER}
      component={PerpsOrderView}
      options={{
        title: 'New Order',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.ORDER_SUCCESS}
      component={PerpsOrderSuccessView}
      options={{
        title: 'Order Success',
        headerShown: false,
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
    <Stack.Screen
      name={Routes.PERPS.POSITIONS}
      component={PerpsPositionsView}
      options={{
        title: 'Positions',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.POSITION_DETAILS}
      component={PerpsPositionDetailsView}
      options={{
        title: 'Position Details',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.ORDER_HISTORY}
      component={PerpsOrderHistoryView}
      options={{
        title: 'Order History',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.ORDER_DETAILS}
      component={PerpsOrderDetailsView}
      options={{
        title: 'Order Details',
        headerShown: false,
      }}
    />
  </Stack.Navigator>
);

export { PerpsScreenStack };
