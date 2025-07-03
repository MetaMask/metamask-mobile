import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import PerpsView from './PerpsView';
import PerpsPositionsView from './PerpsPositionsView';
import PerpsDetailPage from './PerpsDetailPage';

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
    <Stack.Screen
      name={Routes.PERPS.POSITIONS_VIEW}
      component={PerpsPositionsView}
      options={{
        title: 'Perps Positions',
        headerShown: true,
      }}
    />
    <Stack.Screen
      name={Routes.PERPS.DETAIL_PAGE}
      component={PerpsDetailPage}
      options={{
        title: 'Position Details',
        headerShown: true,
      }}
    />
  </Stack.Navigator>
);

export { PerpsScreenStack };
