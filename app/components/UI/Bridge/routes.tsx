import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import { BridgeTokenSelector } from './components/BridgeTokenSelector';
import BridgeView from './Views/BridgeView';
import BlockExplorersModal from './components/TransactionDetails/BlockExplorersModal';
import QuoteExpiredModal from './components/QuoteExpiredModal';
import BlockaidModal from './components/BlockaidModal';
import RecipientSelectorModal from './components/RecipientSelectorModal';
import MarketClosedBottomSheet from './components/MarketClosedBottomSheets/MarketClosedBottomSheet';
import { DefaultSlippageModal } from './components/SlippageModal/DefaultSlippageModal';
import { CustomSlippageModal } from './components/SlippageModal/CustomSlippageModal';

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
      name={Routes.BRIDGE.MODALS.DEFAULT_SLIPPAGE_MODAL}
      component={DefaultSlippageModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.CUSTOM_SLIPPAGE_MODAL}
      component={CustomSlippageModal}
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
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.MARKET_CLOSED_MODAL}
      component={MarketClosedBottomSheet}
    />
  </ModalStack.Navigator>
);
