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
import PerpsOrderView from '../Views/PerpsOrderView';
import PerpsOrderSuccessView from '../Views/PerpsOrderSuccessView';
import PerpsQuoteExpiredModal from '../components/PerpsQuoteExpiredModal';
import PerpsSlippageModal from '../components/PerpsSlippageModal';
import PerpsOrderTypeBottomSheet from '../components/PerpsOrderTypeBottomSheet';
import PerpsLeverageBottomSheet from '../components/PerpsLeverageBottomSheet';
import PerpsTPSLBottomSheet from '../components/PerpsTPSLBottomSheet';
import PerpsInfoBottomSheet from '../components/PerpsInfoBottomSheet';

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

      {/*
        Removed for minimal PR (can be added back in future PRs):
        - PerpsMarketListView (Market list)
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
    <ModalStack.Screen
      name={Routes.PERPS.MODALS.SLIPPAGE_MODAL}
      component={PerpsSlippageModal}
    />
    <ModalStack.Screen
      name={Routes.PERPS.MODALS.ORDER_TYPE_MODAL}
      component={PerpsOrderTypeBottomSheet}
    />
    <ModalStack.Screen
      name={Routes.PERPS.MODALS.LEVERAGE_MODAL}
      component={PerpsLeverageBottomSheet}
    />
    <ModalStack.Screen
      name={Routes.PERPS.MODALS.TPSL_MODAL}
      component={PerpsTPSLBottomSheet}
    />
    <ModalStack.Screen
      name={Routes.PERPS.MODALS.INFO_MODAL}
      component={PerpsInfoBottomSheet}
    />
  </ModalStack.Navigator>
);

export default PerpsScreenStack;
