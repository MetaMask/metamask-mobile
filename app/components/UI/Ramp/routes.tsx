import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import TokenSelection from './components/TokenSelection';
import UnsupportedTokenModal from './components/UnsupportedTokenModal';

const RootStack = createStackNavigator();
const Stack = createStackNavigator();
const ModalsStack = createStackNavigator();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animation: 'none' as const,
};

const MainRoutes = () => (
  <Stack.Navigator
    initialRouteName={Routes.RAMP.TOKEN_SELECTION}
    screenOptions={{ headerShown: true }}
  >
    <Stack.Screen
      name={Routes.RAMP.TOKEN_SELECTION}
      component={TokenSelection}
    />
  </Stack.Navigator>
);

const TokenListModalsRoutes = () => (
  <ModalsStack.Navigator
    screenOptions={{
      ...clearStackNavigatorOptions,
      presentation: 'transparentModal',
    }}
  >
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.UNSUPPORTED_TOKEN}
      component={UnsupportedTokenModal}
    />
  </ModalsStack.Navigator>
);

const TokenListRoutes = () => (
  <RootStack.Navigator
    initialRouteName={Routes.RAMP.TOKEN_SELECTION}
    screenOptions={{ headerShown: false }}
  >
    <RootStack.Screen
      name={Routes.RAMP.TOKEN_SELECTION}
      component={MainRoutes}
    />
    <RootStack.Screen
      name={Routes.RAMP.MODALS.ID}
      component={TokenListModalsRoutes}
      options={{
        ...clearStackNavigatorOptions,
        presentation: 'transparentModal',
        detachPreviousScreen: false,
      }}
    />
  </RootStack.Navigator>
);

export default TokenListRoutes;
