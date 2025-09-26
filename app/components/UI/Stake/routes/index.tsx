import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import StakeConfirmationView from '../Views/StakeConfirmationView/StakeConfirmationView';
import UnstakeConfirmationView from '../Views/UnstakeConfirmationView/UnstakeConfirmationView';
import { StakeSDKProvider } from '../sdk/stakeSdkProvider';
import MaxInputModal from '../../Earn/components/MaxInputModal';
import GasImpactModal from '../components/GasImpactModal';
import StakeEarningsHistoryView from '../Views/StakeEarningsHistoryView/StakeEarningsHistoryView';
import PoolStakingLearnMoreModal from '../components/PoolStakingLearnMoreModal';
import EarnTokenList from '../../Earn/components/EarnTokenList';
import EarnInputView from '../../Earn/Views/EarnInputView/EarnInputView';
import EarnWithdrawInputView from '../../Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView';
import { useEmptyNavHeaderForConfirmations } from '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations';

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
const StakeScreenStack = () => {
  const emptyNavHeaderOptions = useEmptyNavHeaderForConfirmations();

  return (
    <StakeSDKProvider>
      <Stack.Navigator headerMode="screen">
        <Stack.Screen name={Routes.STAKING.STAKE} component={EarnInputView} />
        <Stack.Screen
          name={Routes.STAKING.UNSTAKE}
          component={EarnWithdrawInputView}
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
        <Stack.Screen
          name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
          // Intentionally getting empty title and empty back to avoid flicker before rendering Confirm
          options={emptyNavHeaderOptions}
          component={Confirm}
        />
      </Stack.Navigator>
    </StakeSDKProvider>
  );
};

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
