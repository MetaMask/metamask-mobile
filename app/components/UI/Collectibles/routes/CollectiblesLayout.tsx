import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  collectiblesRoutes,
  type CollectiblesStackParamList,
} from '../routeNames';
import { CollectiblesHomeScreen } from './CollectiblesHomeScreen';
import { CollectiblesPacksScreen } from './CollectiblesPacksScreen';
import { CollectiblesCollectionScreen } from './CollectiblesCollectionScreen';
import { CollectiblesMarketScreen } from './CollectiblesMarketScreen';

const Stack = createNativeStackNavigator<CollectiblesStackParamList>();

export function CollectiblesLayout() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name={collectiblesRoutes.home}
        component={CollectiblesHomeScreen}
      />
      <Stack.Screen
        name={collectiblesRoutes.packs}
        component={CollectiblesPacksScreen}
      />
      <Stack.Screen
        name={collectiblesRoutes.collection}
        component={CollectiblesCollectionScreen}
      />
      <Stack.Screen
        name={collectiblesRoutes.market}
        component={CollectiblesMarketScreen}
      />
    </Stack.Navigator>
  );
}
