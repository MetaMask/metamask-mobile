import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import TokenSelection from './components/TokenSelection';
import UnsupportedTokenModal from './components/UnsupportedTokenModal';

const Stack = createStackNavigator();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

export const RampModalsRoutes = () => (
  <Stack.Navigator mode="modal" screenOptions={clearStackNavigatorOptions}>
    <Stack.Screen
      name={Routes.RAMP.MODALS.UNSUPPORTED_TOKEN}
      component={UnsupportedTokenModal}
    />
  </Stack.Navigator>
);

export default TokenSelection;
