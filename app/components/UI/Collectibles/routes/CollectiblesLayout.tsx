import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { collectiblesRoutes } from '../routeNames';
import { CollectiblesHomeScreen } from './CollectiblesHomeScreen';

type ParamList = Record<typeof collectiblesRoutes.home, undefined>;

const Stack = createNativeStackNavigator<ParamList>();

export function CollectiblesLayout() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name={collectiblesRoutes.home}
        component={CollectiblesHomeScreen}
      />
    </Stack.Navigator>
  );
}
