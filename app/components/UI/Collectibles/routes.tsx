import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../constants/navigation/Routes';
import type { CollectiblesStackParamList } from './types/navigation';
import CollectiblesHomeScreen from './views/CollectiblesHomeScreen';
import CollectiblesPackScreen from './views/CollectiblesPackScreen';

const Stack = createNativeStackNavigator<CollectiblesStackParamList>();

function CollectiblesScreenStack() {
  return (
    <Stack.Navigator
      initialRouteName={Routes.COLLECTIBLES.HOME}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name={Routes.COLLECTIBLES.HOME}
        component={CollectiblesHomeScreen}
      />
      <Stack.Screen
        name={Routes.COLLECTIBLES.PACK}
        component={CollectiblesPackScreen}
      />
    </Stack.Navigator>
  );
}

export default CollectiblesScreenStack;
