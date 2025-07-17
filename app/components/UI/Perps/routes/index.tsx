import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PerpsView from '../Views/PerpsView';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { PerpsConnectionProvider } from '../providers/PerpsConnectionProvider';
import PerpsPositionDetailsView from '../Views/PerpsPositionDetailsView';
import PerpsPositionsView from '../Views/PerpsPositionsView';

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

      {/* 
        Removed for minimal PR (can be added back in future PRs):
        - PerpsMarketListView (Market list)
        - PerpsPositionsView (Positions list)
        - PerpsPositionDetailsView (Position details)
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
