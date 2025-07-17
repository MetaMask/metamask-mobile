import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { PerpsConnectionProvider } from '../providers/PerpsConnectionProvider';
import PerpsDepositAmountView from '../Views/PerpsDepositAmountView';
import PerpsDepositPreviewView from '../Views/PerpsDepositPreviewView';
import PerpsDepositProcessingView from '../Views/PerpsDepositProcessingView';
import PerpsDepositSuccessView from '../Views/PerpsDepositSuccessView';
import PerpsView from '../Views/PerpsView';
import PerpsPositionDetailsView from '../Views/PerpsPositionDetailsView';
import PerpsPositionsView from '../Views/PerpsPositionsView';
import PerpsQuoteExpiredModal from '../components/PerpsQuoteExpiredModal';

const Stack = createStackNavigator();
const ModalStack = createStackNavigator();

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

      {/*
        Removed for minimal PR (can be added back in future PRs):
        - PerpsMarketListView (Market list)
        - PerpsPositionsView (Positions list)
        - PerpsPositionDetailsView (Position details)
        - PerpsOrderView (Order placement)
        - PerpsOrderSuccessView (Order success)
        - PerpsOrderHistoryView (Order history)
        - PerpsOrderDetailsView (Order details)
      */}
    </Stack.Navigator>
  </PerpsConnectionProvider>
);

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

export const PerpsModalStack = () => (
  <ModalStack.Navigator
    mode={'modal'}
    screenOptions={clearStackNavigatorOptions}
  >
    <ModalStack.Screen
      name={Routes.PERPS.MODALS.QUOTE_EXPIRED_MODAL}
      component={PerpsQuoteExpiredModal}
    />
  </ModalStack.Navigator>
);

export default PerpsScreenStack;
