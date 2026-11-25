import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  collectiblesRoutes,
  type CollectiblesStackParamList,
} from '../routeNames';
import { TabsScreen } from './TabsScreen';

const Stack = createNativeStackNavigator<CollectiblesStackParamList>();

export function CollectiblesLayout() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={collectiblesRoutes.tabs} component={TabsScreen} />
    </Stack.Navigator>
  );
}
