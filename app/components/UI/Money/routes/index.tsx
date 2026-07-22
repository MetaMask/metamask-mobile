import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../../constants/navigation/Routes';
import {
  clearNativeStackNavigatorOptions,
  transparentModalScreenOptions,
} from '../../../../constants/navigation/clearStackNavigatorOptions';
import { useTheme } from '../../../../util/theme';
import MoneyHomeView from '../Views/MoneyHomeView';
import MoneyActivityView from '../Views/MoneyActivityView';
import MoneyHowItWorksView from '../Views/MoneyHowItWorksView';
import MoneyAddMoneySheet from '../components/MoneyAddMoneySheet';
import MoneyMoreSheet from '../components/MoneyMoreSheet';
import MoneyTransferSheet from '../components/MoneyTransferSheet';
import MoneyApyInfoSheet from '../components/MoneyApyInfoSheet';
import MoneyEarningsInfoSheet from '../components/MoneyEarningsInfoSheet';
import MoneyBalanceInfoSheet from '../components/MoneyBalanceInfoSheet';
import MoneyLinkCardSheet from '../components/MoneyLinkCardSheet';
import MoneyEarnCryptoInfoSheet from '../components/MoneyEarnCryptoInfoSheet';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import { useEmptyNavHeaderForConfirmations } from '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations';
import { useUpgradeMoneyAccountOnMount } from '../hooks/useUpgradeMoneyAccountOnMount';
import MoneyGeoBlockSheet from '../components/MoneyGeoBlockSheet/MoneyGeoBlockSheet';
import type {
  MoneyConfirmationsNavigationParamList,
  MoneyModalsNavigationParamList,
  MoneyScreensStackParamList,
} from '../types/navigation';

const TabStack = createNativeStackNavigator<MoneyScreensStackParamList>();
const ConfirmationStack =
  createNativeStackNavigator<MoneyConfirmationsNavigationParamList>();
const ModalStack = createNativeStackNavigator<MoneyModalsNavigationParamList>();

// For Money screens that require bottom navbar.
const MoneyTabScreenStack = () => {
  const { colors } = useTheme();

  useUpgradeMoneyAccountOnMount();

  return (
    <TabStack.Navigator
      initialRouteName={Routes.MONEY.HOME}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <TabStack.Screen name={Routes.MONEY.HOME} component={MoneyHomeView} />
      <TabStack.Screen
        name={Routes.MONEY.ACTIVITY}
        component={MoneyActivityView}
      />
      <TabStack.Screen
        name={Routes.MONEY.HOW_IT_WORKS}
        component={MoneyHowItWorksView}
      />
    </TabStack.Navigator>
  );
};

// We separate the confirmation screen so we can define it separately in the MainNavigator outside of the HomeTabs.
// This way we don't want to show the bottom navbar.
const MoneyConfirmationScreenStack = () => {
  const { colors } = useTheme();
  const emptyNavHeaderOptions = useEmptyNavHeaderForConfirmations();

  useUpgradeMoneyAccountOnMount();

  return (
    <ConfirmationStack.Navigator
      initialRouteName={
        Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS
      }
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <ConfirmationStack.Screen
        name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
        options={emptyNavHeaderOptions}
        component={Confirm}
      />
    </ConfirmationStack.Navigator>
  );
};

// Money modals are reachable without the Money tab (e.g. Card Home's "Add
// money" action), so this stack must also kick off the account upgrade —
// opening any Money sheet is the user's signal of intent to use the feature.
const MoneyModalStack = () => {
  useUpgradeMoneyAccountOnMount();

  return (
    <ModalStack.Navigator
      screenOptions={{
        ...clearNativeStackNavigatorOptions,
        ...transparentModalScreenOptions,
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
      <ModalStack.Screen
        name={Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET}
        component={MoneyEarnCryptoInfoSheet}
        options={{ headerShown: false }}
      />
      <ModalStack.Screen
        name={Routes.MONEY.MODALS.GEO_BLOCK_SHEET}
        component={MoneyGeoBlockSheet}
        options={{ headerShown: false }}
      />
    </ModalStack.Navigator>
  );
};

export { MoneyConfirmationScreenStack, MoneyModalStack, MoneyTabScreenStack };
