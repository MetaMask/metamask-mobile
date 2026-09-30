import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../../constants/navigation/Routes';
import { fullScreenModalSlideFromBottomNativeOptions } from '../../../../constants/navigation/clearStackNavigatorOptions';
import type { GachaStackParamList } from '../types/navigation';
import GachaHome from '../views/GachaHome';
import GachaReveal from '../views/GachaReveal';
import GachaCard from '../views/GachaCard';

const Stack = createNativeStackNavigator<GachaStackParamList>();

const REVEAL_OPTIONS = {
  ...fullScreenModalSlideFromBottomNativeOptions,
  // No swipe-to-dismiss while a pack is being paid or a card sold.
  gestureEnabled: false,
};

/** Gacha stack: home, reveal (full-screen modal), card. */
const GachaScreenStack = () => (
  <Stack.Navigator
    initialRouteName={Routes.GACHA.HOME}
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name={Routes.GACHA.HOME} component={GachaHome} />
    <Stack.Screen
      name={Routes.GACHA.REVEAL}
      component={GachaReveal}
      options={REVEAL_OPTIONS}
    />
    <Stack.Screen name={Routes.GACHA.CARD} component={GachaCard} />
  </Stack.Navigator>
);

export default GachaScreenStack;
