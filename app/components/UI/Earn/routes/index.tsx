import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import EarnLendingDepositConfirmationView from '../../Earn/Views/EarnLendingDepositConfirmationView';
import EarnLendingWithdrawalConfirmationView from '../Views/EarnLendingWithdrawalConfirmationView';
import EarnMusdConversionEducationView from '../Views/EarnMusdConversionEducationView';
import EarnLendingMaxWithdrawalModal from '../modals/LendingMaxWithdrawalModal';
import LendingLearnMoreModal from '../LendingLearnMoreModal';
import { Confirm } from '../../../Views/confirmations/components/confirm';

const Stack = createStackNavigator();
const ModalStack = createStackNavigator();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

const EarnScreenStack = () => (
  <Stack.Navigator headerMode="screen">
    <Stack.Screen
      name={Routes.EARN.LENDING_DEPOSIT_CONFIRMATION}
      component={EarnLendingDepositConfirmationView}
    />
    <Stack.Screen
      name={Routes.EARN.LENDING_WITHDRAWAL_CONFIRMATION}
      component={EarnLendingWithdrawalConfirmationView}
    />
    <Stack.Screen
      name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
      component={Confirm}
      options={{
        headerShown: false,
      }}
    />
    <Stack.Screen
      name={Routes.EARN.MUSD.CONVERSION_EDUCATION}
      component={EarnMusdConversionEducationView}
    />
  </Stack.Navigator>
);

const EarnModalStack = () => (
  <ModalStack.Navigator mode="modal" screenOptions={clearStackNavigatorOptions}>
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
  </ModalStack.Navigator>
);

export { EarnScreenStack, EarnModalStack };
