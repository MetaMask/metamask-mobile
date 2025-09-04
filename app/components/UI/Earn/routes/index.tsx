import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import EarnLendingDepositConfirmationView from '../../Earn/Views/EarnLendingDepositConfirmationView';
import EarnLendingWithdrawalConfirmationView from '../Views/EarnLendingWithdrawalConfirmationView';
import EarnLendingMaxWithdrawalModal from '../modals/LendingMaxWithdrawalModal';
import LendingLearnMoreModal from '../LendingLearnMoreModal';
import { RootParamList } from '../../../../util/navigation/types';

const Stack = createStackNavigator<RootParamList>();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

const EarnScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={'EarnLendingDepositConfirmation'}
      component={EarnLendingDepositConfirmationView}
    />
    <Stack.Screen
      name={'EarnLendingWithdrawalConfirmation'}
      component={EarnLendingWithdrawalConfirmationView}
    />
  </Stack.Navigator>
);

const EarnStack = () => (
  <Stack.Navigator
    screenOptions={{ presentation: 'modal', ...clearStackNavigatorOptions }}
  >
    <Stack.Screen
      name={'EarnLendingMaxWithdrawalModal'}
      component={EarnLendingMaxWithdrawalModal}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={'EarnLendingLearnMoreModal'}
      component={LendingLearnMoreModal}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

export { EarnScreenStack, EarnStack };
