import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import { BridgeDestTokenSelector } from './components/BridgeDestTokenSelector';
import { BridgeSourceTokenSelector } from './components/BridgeSourceTokenSelector';
import SlippageModal from './components/SlippageModal';
import { BridgeSourceNetworkSelector } from './components/BridgeSourceNetworkSelector';
import { BridgeDestNetworkSelector } from './components/BridgeDestNetworkSelector';
import QuoteInfoModal from './components/QuoteInfoModal';
import BridgeView from './Views/BridgeView';
import BlockExplorersModal from './components/TransactionDetails/BlockExplorersModal';
import QuoteExpiredModal from './components/QuoteExpiredModal';
import BlockaidModal from './components/BlockaidModal';
import PriceImpactWarningModal from './components/PriceImpactWarningModal';

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

const Stack = createStackNavigator();
export const BridgeScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen name={Routes.BRIDGE.BRIDGE_VIEW} component={BridgeView} />
  </Stack.Navigator>
);

const ModalStack = createStackNavigator();
export const BridgeModalStack = () => (
  <ModalStack.Navigator
    screenOptions={{ presentation: 'modal', ...clearStackNavigatorOptions }}
  >
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR}
      component={BridgeSourceTokenSelector}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR}
      component={BridgeDestTokenSelector}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR}
      component={BridgeSourceNetworkSelector}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR}
      component={BridgeDestNetworkSelector}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.SLIPPAGE_MODAL}
      component={SlippageModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.QUOTE_INFO_MODAL}
      component={QuoteInfoModal}
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
      name={Routes.BRIDGE.MODALS.PRICE_IMPACT_WARNING_MODAL}
      component={PriceImpactWarningModal}
    />
  </ModalStack.Navigator>
);
