import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import TokenSelection from './components/TokenSelection';
import BuildQuote from './components/BuildQuote';
import UnsupportedTokenModal from './components/UnsupportedTokenModal';
import SettingsModal from './components/Modals/SettingsModal';

const RootStack = createStackNavigator();
const Stack = createStackNavigator();
const ModalsStack = createStackNavigator();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

const MainRoutes = () => (
  <Stack.Navigator
    initialRouteName={Routes.RAMP.TOKEN_SELECTION}
    headerMode="screen"
  >
    <Stack.Screen
      name={Routes.RAMP.TOKEN_SELECTION}
      component={TokenSelection}
    />
    <Stack.Screen name={Routes.RAMP.AMOUNT_INPUT} component={BuildQuote} />
  </Stack.Navigator>
);

const TokenListModalsRoutes = () => (
  <ModalsStack.Navigator
    mode="modal"
    screenOptions={clearStackNavigatorOptions}
  >
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.UNSUPPORTED_TOKEN}
      component={UnsupportedTokenModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.BUILD_QUOTE_SETTINGS}
      component={SettingsModal}
    />
  </ModalsStack.Navigator>
);

const TokenListRoutes = () => (
  <RootStack.Navigator
    initialRouteName={Routes.RAMP.TOKEN_SELECTION}
    headerMode="none"
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
        detachPreviousScreen: false,
      }}
    />
  </RootStack.Navigator>
);

export default TokenListRoutes;
