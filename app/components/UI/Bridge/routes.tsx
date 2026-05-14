import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../constants/navigation/Routes';
import { BridgeTokenSelector } from './components/BridgeTokenSelector';
import BridgeView from './Views/BridgeView';
import { BatchSellTokenSelect } from './Views/BatchSellTokenSelect';
import { BatchSellReview } from './Views/BatchSellReview';
import BlockExplorersModal from './components/TransactionDetails/BlockExplorersModal';
import BlockaidModal from './components/BlockaidModal';
import RecipientSelectorModal from './components/RecipientSelectorModal';
import MarketClosedBottomSheet from './components/MarketClosedBottomSheets/MarketClosedBottomSheet';
import { BatchSellDefaultSlippageModal } from './components/SlippageModal/BatchSellDefaultSlippageModal';
import { BatchSellCustomSlippageModal } from './components/SlippageModal/BatchSellCustomSlippageModal';
import { SwapDefaultSlippageModal } from './components/SlippageModal/SwapDefaultSlippageModal';
import { SwapCustomSlippageModal } from './components/SlippageModal/SwapCustomSlippageModal';
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
import { BatchSellDestinationTokenSelectorModal } from './components/BatchSellDestinationTokenSelectorModal';
import { BatchSellQuoteDetailsModal } from './components/BatchSellQuoteDetailsModal';
import { BatchSellFinalReviewModal } from './components/BatchSellFinalReviewModal';
import { BatchSellMinimumReceivedInfoModal } from './components/BatchSellMinimumReceivedInfoModal';

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
      name={Routes.BRIDGE.BATCH_SELL_REVIEW}
      component={BatchSellReview}
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
      name={Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL}
      component={SwapDefaultSlippageModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.SWAP_CUSTOM_SLIPPAGE_MODAL}
      component={SwapCustomSlippageModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.BATCH_SELL_DEFAULT_SLIPPAGE_MODAL}
      component={BatchSellDefaultSlippageModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.BATCH_SELL_CUSTOM_SLIPPAGE_MODAL}
      component={BatchSellCustomSlippageModal}
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
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.BATCH_SELL_DESTINATION_TOKEN_SELECTOR_MODAL}
      component={BatchSellDestinationTokenSelectorModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.BATCH_SELL_QUOTE_DETAILS_MODAL}
      component={BatchSellQuoteDetailsModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL}
      component={BatchSellFinalReviewModal}
    />
    <ModalStack.Screen
      name={Routes.BRIDGE.MODALS.BATCH_SELL_MINIMUM_RECEIVED_INFO_MODAL}
      component={BatchSellMinimumReceivedInfoModal}
    />
  </ModalStack.Navigator>
);
