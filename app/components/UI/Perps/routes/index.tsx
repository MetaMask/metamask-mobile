import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PerpsView from '../Views/PerpsView';
import PerpsMarketListView from '../Views/PerpsMarketListView';
import PerpsPositionsView from '../Views/PerpsPositionsView';
import PerpsPositionDetailsView from '../Views/PerpsPositionDetailsView';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { PerpsConnectionProvider } from '../providers/PerpsConnectionProvider';

const Stack = createStackNavigator();

const PerpsScreenStack = () => (
  <PerpsConnectionProvider>
    <Stack.Navigator initialRouteName={Routes.PERPS.TRADING_VIEW}>
      {/* Main trading view with minimal functionality */}
      <Stack.Screen
        name={Routes.PERPS.TRADING_VIEW}
        component={PerpsView}
        options={{
          title: strings('perps.title'),
          headerShown: true,
        }}
      />

      {/* Follow-up screens for future PRs - simplified hello world versions */}
      <Stack.Screen
        name="PerpsMarketList"
        component={PerpsMarketListView}
        options={{
          title: 'Market List',
          headerShown: true,
        }}
      />

      <Stack.Screen
        name={Routes.PERPS.POSITIONS}
        component={PerpsPositionsView}
        options={{
          title: 'Positions',
          headerShown: true,
        }}
      />

      <Stack.Screen
        name={Routes.PERPS.POSITION_DETAILS}
        component={PerpsPositionDetailsView}
        options={{
          title: 'Position Details',
          headerShown: true,
        }}
      />

      {/* 
        Removed for minimal PR (can be added back in future PRs):
        - PerpsOrderView (Order placement)
        - PerpsOrderSuccessView (Order success)
        - PerpsDepositAmountView (Deposit flow)
        - PerpsDepositPreviewView (Deposit preview)
        - PerpsDepositProcessingView (Deposit processing)
        - PerpsDepositSuccessView (Deposit success)
        - PerpsOrderHistoryView (Order history)
        - PerpsOrderDetailsView (Order details)
      */}
    </Stack.Navigator>
  </PerpsConnectionProvider>
);

export default PerpsScreenStack;
