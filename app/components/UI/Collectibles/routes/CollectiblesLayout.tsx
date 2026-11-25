import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  collectiblesRoutes,
  type CollectiblesStackParamList,
} from '../routeNames';
import { HomeScreen } from './HomeScreen';
import { PacksScreen } from './PacksScreen';
import { CollectionScreen } from './CollectionScreen';
import { MarketScreen } from './MarketScreen';

const Stack = createNativeStackNavigator<CollectiblesStackParamList>();

export function CollectiblesLayout() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={collectiblesRoutes.home} component={HomeScreen} />
      <Stack.Screen name={collectiblesRoutes.packs} component={PacksScreen} />
      <Stack.Screen
        name={collectiblesRoutes.collection}
        component={CollectionScreen}
      />
      <Stack.Screen name={collectiblesRoutes.market} component={MarketScreen} />
    </Stack.Navigator>
  );
}
