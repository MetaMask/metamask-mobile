import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../../constants/navigation/Routes';
import EarnLendingDepositConfirmationView from '../../Earn/Views/EarnLendingDepositConfirmationView';
import EarnLendingWithdrawalConfirmationView from '../Views/EarnLendingWithdrawalConfirmationView';
import EarnStrategySelectionView from '../Views/EarnStrategySelectionView';
import EarnLendingMaxWithdrawalModal from '../modals/LendingMaxWithdrawalModal';
import LendingLearnMoreModal from '../LendingLearnMoreModal';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import { useEmptyNavHeaderForConfirmations } from '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations';
import {
  clearNativeStackNavigatorOptions,
  transparentModalScreenOptions,
} from '../../../../constants/navigation/clearStackNavigatorOptions';
import type {
  EarnModalsNavigationParamList,
  EarnScreensStackParamList,
} from '../types/navigation';

const Stack = createNativeStackNavigator<EarnScreensStackParamList>();
const ModalStack = createNativeStackNavigator<EarnModalsNavigationParamList>();

const EarnScreenStack = () => {
  const emptyNavHeaderOptions = useEmptyNavHeaderForConfirmations();

  return (
    <Stack.Navigator screenOptions={transparentModalScreenOptions}>
      <Stack.Screen
        name={Routes.EARN.LENDING_DEPOSIT_CONFIRMATION}
        component={EarnLendingDepositConfirmationView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={Routes.EARN.LENDING_WITHDRAWAL_CONFIRMATION}
        component={EarnLendingWithdrawalConfirmationView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
        component={Confirm}
        options={{ ...emptyNavHeaderOptions, presentation: 'card' }}
      />
      <Stack.Screen
        name={Routes.EARN.STRATEGY_SELECTION}
        component={EarnStrategySelectionView}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const EarnModalStack = () => (
  <ModalStack.Navigator
    screenOptions={{
      ...clearNativeStackNavigatorOptions,
      ...transparentModalScreenOptions,
    }}
  >
    <ModalStack.Screen
      name={Routes.EARN.MODALS.LENDING_MAX_WITHDRAWAL}
      component={EarnLendingMaxWithdrawalModal}
      options={{ headerShown: false }}
    />
    <ModalStack.Screen
      name={Routes.EARN.MODALS.LENDING_LEARN_MORE}
      component={LendingLearnMoreModal}
      options={{ headerShown: false }}
    />
    <ModalStack.Screen
      name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
      component={Confirm}
      options={{ headerShown: false, presentation: 'card' }}
    />
  </ModalStack.Navigator>
);

export { EarnScreenStack, EarnModalStack };
