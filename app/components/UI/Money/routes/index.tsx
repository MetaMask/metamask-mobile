import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import { clearStackNavigatorOptions } from '../../../../constants/navigation/clearStackNavigatorOptions';
import { useTheme } from '../../../../util/theme';
import MoneyHomeView from '../Views/MoneyHomeView';
import MoneyActivityView from '../Views/MoneyActivityView';
import MoneyHowItWorksView from '../Views/MoneyHowItWorksView';
import MoneyAddMoneySheet from '../components/MoneyAddMoneySheet';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import { useEmptyNavHeaderForConfirmations } from '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations';

const Stack = createStackNavigator();
const ModalStack = createStackNavigator();

const MoneyScreenStack = () => {
  const { colors } = useTheme();
  const emptyNavHeaderOptions = useEmptyNavHeaderForConfirmations();

  return (
    <Stack.Navigator
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
  </ModalStack.Navigator>
);

export { MoneyScreenStack, MoneyModalStack };
