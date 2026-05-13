import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import { clearStackNavigatorOptions } from '../../../../constants/navigation/clearStackNavigatorOptions';
import { useTheme } from '../../../../util/theme';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { upgradeMoneyAccount } from '../../../../actions/money';
import MoneyHomeView from '../Views/MoneyHomeView';
import MoneyActivityView from '../Views/MoneyActivityView';
import MoneyHowItWorksView from '../Views/MoneyHowItWorksView';
import MoneyPotentialEarningsView from '../Views/MoneyPotentialEarningsView';
import MoneyAddMoneySheet from '../components/MoneyAddMoneySheet';
import MoneyMoreSheet from '../components/MoneyMoreSheet';
import MoneyTransferSheet from '../components/MoneyTransferSheet';
import MoneyApyInfoSheet from '../components/MoneyApyInfoSheet';
import MoneyEarningsInfoSheet from '../components/MoneyEarningsInfoSheet';
import MoneyBalanceInfoSheet from '../components/MoneyBalanceInfoSheet';
import MoneyLinkCardSheet from '../components/MoneyLinkCardSheet';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import { useEmptyNavHeaderForConfirmations } from '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations';

const Stack = createStackNavigator();
const ModalStack = createStackNavigator();

const MoneyScreenStack = () => {
  const { colors } = useTheme();
  const emptyNavHeaderOptions = useEmptyNavHeaderForConfirmations();

  return (
    <Stack.Navigator
      initialRouteName={Routes.MONEY.HOME}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background.default },
      }}
    >
      <Stack.Screen name={Routes.MONEY.HOME} component={MoneyHomeView} />
      <Stack.Screen
        name={Routes.MONEY.ACTIVITY}
        component={MoneyActivityView}
      />
      <Stack.Screen
        name={Routes.MONEY.HOW_IT_WORKS}
        component={MoneyHowItWorksView}
      />
      <Stack.Screen
        name={Routes.MONEY.POTENTIAL_EARNINGS}
        component={MoneyPotentialEarningsView}
      />
      <Stack.Screen
        name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
        options={emptyNavHeaderOptions}
        component={Confirm}
      />
    </Stack.Navigator>
  );
};

const MoneyModalStack = () => (
  <ModalStack.Navigator
    screenOptions={{
      ...clearStackNavigatorOptions,
      presentation: 'transparentModal',
    }}
  >
    <ModalStack.Screen
      name={Routes.MONEY.MODALS.ADD_MONEY_SHEET}
      component={MoneyAddMoneySheet}
      options={{ headerShown: false }}
    />
    <ModalStack.Screen
      name={Routes.MONEY.MODALS.MORE_SHEET}
      component={MoneyMoreSheet}
      options={{ headerShown: false }}
    />
    <ModalStack.Screen
      name={Routes.MONEY.MODALS.TRANSFER_MONEY_SHEET}
      component={MoneyTransferSheet}
      options={{ headerShown: false }}
    />
    <ModalStack.Screen
      name={Routes.MONEY.MODALS.APY_INFO_SHEET}
      component={MoneyApyInfoSheet}
      options={{ headerShown: false }}
    />
    <ModalStack.Screen
      name={Routes.MONEY.MODALS.EARNINGS_INFO_SHEET}
      component={MoneyEarningsInfoSheet}
      options={{ headerShown: false }}
    />
    <ModalStack.Screen
      name={Routes.MONEY.MODALS.MONEY_BALANCE_INFO_SHEET}
      component={MoneyBalanceInfoSheet}
      options={{ headerShown: false }}
    />
    <ModalStack.Screen
      name={Routes.MONEY.MODALS.LINK_CARD_SHEET}
      component={MoneyLinkCardSheet}
      options={{ headerShown: false }}
    />
  </ModalStack.Navigator>
);

const MoneyAccountStackGate = () => {
  const dispatch = useThunkDispatch();

  useEffect(() => {
    dispatch(upgradeMoneyAccount());
  }, [dispatch]);

  return <MoneyScreenStack />;
};

export { MoneyAccountStackGate, MoneyScreenStack, MoneyModalStack };
