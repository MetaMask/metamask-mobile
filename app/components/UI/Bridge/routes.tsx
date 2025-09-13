import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
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
import { type RootParamList } from '../../../util/navigation';

const Stack = createStackNavigator<RootParamList>();

export const BridgeScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="BridgeView" component={BridgeView} />
  </Stack.Navigator>
);

export const BridgeModalStack = () => (
  <Stack.Group screenOptions={{ presentation: 'transparentModal' }}>
    <Stack.Screen
      name={'BridgeSourceTokenSelector'}
      component={BridgeSourceTokenSelector}
    />
    <Stack.Screen
      name={'BridgeDestTokenSelector'}
      component={BridgeDestTokenSelector}
    />
    <Stack.Screen
      name={'BridgeSourceNetworkSelector'}
      component={BridgeSourceNetworkSelector}
    />
    <Stack.Screen
      name={'BridgeDestNetworkSelector'}
      component={BridgeDestNetworkSelector}
    />
    <Stack.Screen name={'SlippageModal'} component={SlippageModal} />
    <Stack.Screen name={'QuoteInfoModal'} component={QuoteInfoModal} />
    <Stack.Screen
      name={'TransactionDetailsBlockExplorer'}
      component={BlockExplorersModal}
    />
    <Stack.Screen name={'QuoteExpiredModal'} component={QuoteExpiredModal} />
    <Stack.Screen name={'BlockaidModal'} component={BlockaidModal} />
    <Stack.Screen
      name={'PriceImpactWarningModal'}
      component={PriceImpactWarningModal}
    />
  </Stack.Group>
);
