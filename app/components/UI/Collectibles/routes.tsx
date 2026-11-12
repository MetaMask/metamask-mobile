import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../constants/navigation/Routes';
import type { CollectiblesStackParamList } from './types/navigation';
import CollectiblesHome from './views/CollectiblesHome';

const Stack = createNativeStackNavigator<CollectiblesStackParamList>();

/** Collectibles navigation stack. */
const CollectiblesScreenStack = () => (
  <Stack.Navigator
    initialRouteName={Routes.COLLECTIBLES.HOME}
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen
      name={Routes.COLLECTIBLES.HOME}
      component={CollectiblesHome}
    />
  </Stack.Navigator>
);

export default CollectiblesScreenStack;
