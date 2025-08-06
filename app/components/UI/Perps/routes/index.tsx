import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { PerpsConnectionProvider } from '../providers/PerpsConnectionProvider';
import PerpsMarketListView from '../Views/PerpsMarketListView/PerpsMarketListView';
import PerpsMarketDetailsView from '../Views/PerpsMarketDetailsView';
import PerpsDepositAmountView from '../Views/PerpsDepositAmountView';
import PerpsView from '../Views/PerpsView';
import PerpsPositionDetailsView from '../Views/PerpsPositionDetailsView';
import PerpsPositionsView from '../Views/PerpsPositionsView';
import PerpsWithdrawView from '../Views/PerpsWithdrawView';
import PerpsOrderView from '../Views/PerpsOrderView';
import PerpsQuoteExpiredModal from '../components/PerpsQuoteExpiredModal';

const Stack = createStackNavigator();
const ModalStack = createStackNavigator();

const PerpsModalStack = () => (
  <ModalStack.Navigator
    mode="modal"
    screenOptions={{
      headerShown: false,
      cardStyle: {
        backgroundColor: 'transparent',
      },
    }}
  >
    <ModalStack.Screen
      name={Routes.PERPS.MODALS.QUOTE_EXPIRED_MODAL}
      component={PerpsQuoteExpiredModal}
    />
  </ModalStack.Navigator>
);

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
        name={Routes.PERPS.MARKETS}
        component={PerpsMarketListView}
        options={{
          title: strings('perps.markets.title'),
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

      {/* Withdrawal flow screens */}
      <Stack.Screen
        name={Routes.PERPS.WITHDRAW}
        component={PerpsWithdrawView}
        options={{
          title: strings('perps.withdrawal.title'),
          headerShown: false,
        }}
      />

      <Stack.Screen
        name={Routes.PERPS.MARKET_DETAILS}
        component={PerpsMarketDetailsView}
        options={{
          title: strings('perps.market.details.title'),
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
        name={Routes.PERPS.ORDER}
        component={PerpsOrderView}
        options={{
          title: strings('perps.order.title'),
          headerShown: false,
        }}
      />

      {/* Modal stack for bottom sheet modals */}
      <Stack.Screen
        name={Routes.PERPS.MODALS.ROOT}
        component={PerpsModalStack}
        options={{
          headerShown: false,
          cardStyle: {
            backgroundColor: 'transparent',
          },
          animationEnabled: false,
        }}
      />
    </Stack.Navigator>
  </PerpsConnectionProvider>
);

// Export the stack wrapped with provider
export default PerpsScreenStack;
export { PerpsModalStack };
