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
import { RootParamList } from '../../../../util/navigation/types';

const Stack = createStackNavigator<RootParamList>();

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
    <Stack.Navigator screenOptions={{ headerMode: 'screen' }}>
      <Stack.Screen name={'Stake'} component={EarnInputView} />
      <Stack.Screen name={'Unstake'} component={EarnWithdrawInputView} />
      <Stack.Screen
        name={'StakeConfirmation'}
        component={StakeConfirmationView}
      />
      <Stack.Screen
        name={'UnstakeConfirmation'}
        component={UnstakeConfirmationView}
      />
      <Stack.Screen
        name={'EarningsHistory'}
        component={StakeEarningsHistoryView}
      />
      <Stack.Screen name={'RedesignedConfirmations'} component={Confirm} />
    </Stack.Navigator>
  </StakeSDKProvider>
);

// Modal Stack for Modals
const StakeStack = () => (
  <StakeSDKProvider>
    <Stack.Navigator
      screenOptions={{ presentation: 'modal', ...clearStackNavigatorOptions }}
    >
      <Stack.Screen
        name={'LearnMore'}
        component={PoolStakingLearnMoreModal}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={'MaxInput'}
        component={MaxInputModal}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={'GasImpact'}
        component={GasImpactModal}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={'EarnTokenList'}
        component={EarnTokenList}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  </StakeSDKProvider>
);

export { StakeScreenStack, StakeStack };
