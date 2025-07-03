import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import PerpsView from './PerpsView';

const Stack = createStackNavigator();

const PerpsScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.PERPS.ROOT}
      component={PerpsView}
      options={{
        title: 'Perps Trading',
        headerShown: true,
      }}
    />
  </Stack.Navigator>
);

export { PerpsScreenStack };
