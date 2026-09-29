import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../../constants/navigation/Routes';
import type { GachaStackParamList } from '../types/navigation';
import GachaHome from '../views/GachaHome';

const Stack = createNativeStackNavigator<GachaStackParamList>();

/** Gacha navigation stack. */
const GachaScreenStack = () => (
  <Stack.Navigator
    initialRouteName={Routes.GACHA.HOME}
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name={Routes.GACHA.HOME} component={GachaHome} />
  </Stack.Navigator>
);

export default GachaScreenStack;
