import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import { BridgeTokenSelector } from './components/BridgeTokenSelector';
import SlippageModal from './components/SlippageModal';
import BridgeView from './Views/BridgeView';
import BlockExplorersModal from './components/TransactionDetails/BlockExplorersModal';
import QuoteExpiredModal from './components/QuoteExpiredModal';
import BlockaidModal from './components/BlockaidModal';
import RecipientSelectorModal from './components/RecipientSelectorModal';

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

const Stack = createStackNavigator();
export const BridgeScreenStack = () => (
  <Stack.Navigator
    headerMode="screen"
    screenOptions={{
      headerShown: true,
    }}
  >
    <Stack.Screen
      name={Routes.BRIDGE.BRIDGE_VIEW}
      component={BridgeView}
      options={{ title: '' }}
    />
    <Stack.Screen
      name={Routes.BRIDGE.TOKEN_SELECTOR}
      component={BridgeTokenSelector}
      options={{ title: '' }}
    />
  </Stack.Navigator>
);

const ModalStack = createStackNavigator();
export const BridgeModalStack = () => (
  <ModalStack.Navigator
    mode={'modal'}
    screenOptions={clearStackNavigatorOptions}
  >
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.SLIPPAGE_MODAL}
      component={SlippageModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER}
      component={BlockExplorersModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL}
      component={QuoteExpiredModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.BLOCKAID_MODAL}
      component={BlockaidModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.RECIPIENT_SELECTOR_MODAL}
      component={RecipientSelectorModal}
    />
  </ModalStack.Navigator>
);
