import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import EarnLendingDepositConfirmationView from '../../Earn/Views/EarnLendingDepositConfirmationView';
import EarnLendingWithdrawalConfirmationView from '../Views/EarnLendingWithdrawalConfirmationView';
import EarnLendingMaxWithdrawalModal from '../modals/LendingMaxWithdrawalModal';
import LendingLearnMoreModal from '../LendingLearnMoreModal';
import { RootParamList } from '../../../../util/navigation/types';

const Stack = createStackNavigator<RootParamList>();

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

const EarnModalStack = () => (
  <Stack.Group screenOptions={{ presentation: 'transparentModal' }}>
    <Stack.Screen
      name={'EarnLendingMaxWithdrawalModal'}
      component={EarnLendingMaxWithdrawalModal}
    />
    <Stack.Screen
      name={'EarnLendingLearnMoreModal'}
      component={LendingLearnMoreModal}
    />
  </Stack.Group>
);

export { EarnScreenStack, EarnModalStack };
