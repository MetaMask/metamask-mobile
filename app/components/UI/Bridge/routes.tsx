import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../constants/navigation/Routes';
import { BridgeTokenSelector } from './components/BridgeTokenSelector';
import BridgeView from './Views/BridgeView';
import { BatchSellTokenSelect } from './Views/BatchSellTokenSelect';
import BlockExplorersModal from './components/TransactionDetails/BlockExplorersModal';
import BlockaidModal from './components/BlockaidModal';
import RecipientSelectorModal from './components/RecipientSelectorModal';
import MarketClosedBottomSheet from './components/MarketClosedBottomSheets/MarketClosedBottomSheet';
import { DefaultSlippageModal } from './components/SlippageModal/DefaultSlippageModal';
import { CustomSlippageModal } from './components/SlippageModal/CustomSlippageModal';
import NetworkListModal from './components/BridgeTokenSelector/NetworkListModal';
import { QuoteSelectorView } from './components/QuoteSelectorView';
import { PriceImpactModal } from './components/PriceImpactModal';
import {
  clearNativeStackNavigatorOptions,
  transparentModalScreenOptions,
} from '../../../constants/navigation/clearStackNavigatorOptions';
import { TokenWarningModal } from './components/TokenWarningModal';
import { MissingPriceModal } from './components/MissingPriceModal';
import { HighRateAlertModal } from './components/HighRateAlertModal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScreenComponent = React.ComponentType<any>;

const Stack = createNativeStackNavigator();
export const BridgeScreenStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name={Routes.BRIDGE.BRIDGE_VIEW} component={BridgeView} />
    <Stack.Screen
      name={Routes.BRIDGE.TOKEN_SELECTOR}
      component={BridgeTokenSelector}
    />
    <Stack.Screen
      name={Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT}
      component={BatchSellTokenSelect}
      options={{ title: '' }}
    />
    <Stack.Screen
      name={Routes.BRIDGE.QUOTE_SELECTOR_VIEW}
      component={QuoteSelectorView}
    />
  </Stack.Navigator>
);

const ModalStack = createNativeStackNavigator();
export const BridgeModalStack = () => (
  <ModalStack.Navigator
    screenOptions={{
      ...clearNativeStackNavigatorOptions,
      ...transparentModalScreenOptions,
    }}
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
      component={BlockExplorersModal as ScreenComponent}
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
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL}
      component={NetworkListModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.PRICE_IMPACT_MODAL}
      component={PriceImpactModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.MISSING_PRICE_MODAL}
      component={MissingPriceModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.TOKEN_WARNING_MODAL}
      component={TokenWarningModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.HIGH_RATE_ALERT_MODAL}
      component={HighRateAlertModal}
    />
  </ModalStack.Navigator>
);
