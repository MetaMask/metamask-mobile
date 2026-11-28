import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  collectiblesRoutes,
  type CollectiblesStackParamList,
} from '../routeNames';
import { CollectiblesHomeScreen } from './CollectiblesHomeScreen';
import { PackDetailScreen } from './PackDetailScreen';

const Stack = createNativeStackNavigator<CollectiblesStackParamList>();

export function CollectiblesLayout() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name={collectiblesRoutes.home}
        component={CollectiblesHomeScreen}
      />
      <Stack.Screen
        name={collectiblesRoutes.packDetail}
        component={PackDetailScreen}
      />
    </Stack.Navigator>
  );
}
