import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StakeInputView from '../Views/StakeInputView/StakeInputView';
import Routes from '../../../../constants/navigation/Routes';
import StakeConfirmationView from '../Views/StakeConfirmationView/StakeConfirmationView';
import UnstakeInputView from '../Views/UnstakeInputView/UnstakeInputView';
import UnstakeConfirmationView from '../Views/UnstakeConfirmationView/UnstakeConfirmationView';
import { StakeSDKProvider } from '../sdk/stakeSdkProvider';
import MaxInputModal from '../components/MaxInputModal';
import GasImpactModal from '../components/GasImpactModal';
import StakeEarningsHistoryView from '../Views/StakeEarningsHistoryView/StakeEarningsHistoryView';
import PoolStakingLearnMoreModal from '../components/PoolStakingLearnMoreModal';
import EarnTokenList from '../components/EarnTokenList';
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
const StakeScreenStack = () => (
  <StakeSDKProvider>
    <Stack.Navigator>
      <Stack.Screen name={Routes.STAKING.STAKE} component={StakeInputView} />
      <Stack.Screen
        name={Routes.STAKING.UNSTAKE}
        component={UnstakeInputView}
      />
      <Stack.Screen
        name={Routes.STAKING.STAKE_CONFIRMATION}
        component={StakeConfirmationView}
      />
      <Stack.Screen
        name={Routes.STAKING.UNSTAKE_CONFIRMATION}
        component={UnstakeConfirmationView}
      />
      <Stack.Screen
        name={Routes.STAKING.EARNINGS_HISTORY}
        component={StakeEarningsHistoryView}
      />
    </Stack.Navigator>
  </StakeSDKProvider>
);

// Modal Stack for Modals
const StakeModalStack = () => (
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

export { StakeScreenStack, StakeModalStack };
