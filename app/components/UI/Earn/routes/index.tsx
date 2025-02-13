import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import InputView from '../Views/InputView';
import { StakeSDKProvider } from '../../Stake/sdk/stakeSdkProvider';
import MaxInputModal from '../../Stake/components/MaxInputModal';
import GasImpactModal from '../../Stake/components/GasImpactModal';
import PoolStakingLearnMoreModal from '../../Stake/components/PoolStakingLearnMoreModal';
import EarnTokenList from '../../Stake/components/EarnTokenList';

const Stack = createStackNavigator();
const ModalStack = createStackNavigator();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

// Regular Stack for Screens
const EarnScreenStack = () => (
  <StakeSDKProvider>
    <Stack.Navigator>
      <Stack.Screen name={Routes.STAKING.STAKE} component={InputView} />
    </Stack.Navigator>
  </StakeSDKProvider>
);

// Modal Stack for Modals
const EarnModalStack = () => (
  <StakeSDKProvider>
    <ModalStack.Navigator
      mode={'modal'}
      screenOptions={clearStackNavigatorOptions}
    >
      <ModalStack.Screen
        name={Routes.STAKING.MODALS.LEARN_MORE}
        component={PoolStakingLearnMoreModal}
        options={{ headerShown: false }}
      />
      <ModalStack.Screen
        name={Routes.STAKING.MODALS.MAX_INPUT}
        component={MaxInputModal}
        options={{ headerShown: false }}
      />
      <ModalStack.Screen
        name={Routes.STAKING.MODALS.GAS_IMPACT}
        component={GasImpactModal}
        options={{ headerShown: false }}
      />
      <ModalStack.Screen
        name={Routes.STAKING.MODALS.EARN_TOKEN_LIST}
        component={EarnTokenList}
        options={{ headerShown: false }}
      />
    </ModalStack.Navigator>
  </StakeSDKProvider>
);

export { EarnScreenStack, EarnModalStack };
