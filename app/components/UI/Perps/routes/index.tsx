import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { PerpsConnectionProvider } from '../providers/PerpsConnectionProvider';
import PerpsMarketListView from '../Views/PerpsMarketListView/PerpsMarketListView';
import PerpsDepositAmountView from '../Views/PerpsDepositAmountView';
import PerpsDepositPreviewView from '../Views/PerpsDepositPreviewView';
import PerpsDepositProcessingView from '../Views/PerpsDepositProcessingView';
import PerpsDepositSuccessView from '../Views/PerpsDepositSuccessView';
import PerpsView from '../Views/PerpsView';
import PerpsPositionDetailsView from '../Views/PerpsPositionDetailsView';
import PerpsPositionsView from '../Views/PerpsPositionsView';
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

      {/*
      Removed for minimal PR (can be added back in future PRs):
      - PerpsMarketListView (Market list)
      - PerpsOrderHistoryView (Order history)
      - PerpsOrderDetailsView (Order details)
    */}
    </Stack.Navigator>
  </PerpsConnectionProvider>
);

// Export the stack wrapped with provider
export default PerpsScreenStack;
export { PerpsModalStack };
