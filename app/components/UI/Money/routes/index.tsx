import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import { useTheme } from '../../../../util/theme';
import MoneyHomeView from '../Views/MoneyHomeView';
import MoneyActivityView from '../Views/MoneyActivityView';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import { useEmptyNavHeaderForConfirmations } from '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations';

const Stack = createStackNavigator();

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
        name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
        options={emptyNavHeaderOptions}
        component={Confirm}
      />
    </Stack.Navigator>
  );
};

export { MoneyScreenStack };
