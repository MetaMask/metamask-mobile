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
import { strings } from '../../../../../locales/i18n';

const Stack = createStackNavigator();

const PerpsScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.PERPS.TRADING_VIEW}
      component={PerpsView}
      options={{
        title: strings('perps.title'),
        headerShown: true,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.ORDER}
      component={PerpsOrderView}
      options={{
        title: strings('perps.order.title'),
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.ORDER_SUCCESS}
      component={PerpsOrderSuccessView}
      options={{
        title: strings('perps.order.success.title'),
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.DEPOSIT}
      component={PerpsDepositAmountView}
      options={{
        title: strings('perps.deposit.title'),
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.DEPOSIT_PREVIEW}
      component={PerpsDepositPreviewView}
      options={{
        title: strings('perps.deposit.preview.title'),
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.DEPOSIT_PROCESSING}
      component={PerpsDepositProcessingView}
      options={{
        title: strings('perps.deposit.processing.title'),
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.DEPOSIT_SUCCESS}
      component={PerpsDepositSuccessView}
      options={{
        title: strings('perps.deposit.success.title'),
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.POSITIONS}
      component={PerpsPositionsView}
      options={{
        title: strings('perps.position.title'),
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.POSITION_DETAILS}
      component={PerpsPositionDetailsView}
      options={{
        title: strings('perps.position.details.title'),
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.ORDER_HISTORY}
      component={PerpsOrderHistoryView}
      options={{
        title: strings('perps.order.history.title'),
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.ORDER_DETAILS}
      component={PerpsOrderDetailsView}
      options={{
        title: strings('perps.order.details.title'),
        headerShown: false,
      }}
    />
  </Stack.Navigator>
);

export { PerpsScreenStack };
