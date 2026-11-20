import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { collectiblesRoutes } from './routeNames';
import type { CollectiblesStackParamList } from './types/navigation';
import { CollectiblesHomeScreen } from './views/CollectiblesHomeScreen';

const Stack = createNativeStackNavigator<CollectiblesStackParamList>();

export function CollectiblesScreenStack() {
  return (
    <Stack.Navigator
      initialRouteName={collectiblesRoutes.home}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name={collectiblesRoutes.home}
        component={CollectiblesHomeScreen}
      />
    </Stack.Navigator>
  );
}
