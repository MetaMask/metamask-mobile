import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import { useTheme } from '../../../../util/theme';
import MoneyHomeView from '../Views/MoneyHomeView';
import MoneyActivityView from '../Views/MoneyActivityView';

const Stack = createStackNavigator();

const MoneyScreenStack = () => {
  const { colors } = useTheme();

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
    </Stack.Navigator>
  );
};

export { MoneyScreenStack };
