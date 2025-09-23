import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import CardHome from '../Views/CardHome/CardHome';
import { CardSDKProvider } from '../sdk';
import CardWelcome from '../Views/CardWelcome/CardWelcome';

const Stack = createStackNavigator();

const CardRoutes = () => (
  <CardSDKProvider>
    <Stack.Navigator initialRouteName={Routes.CARD.HOME} headerMode="screen">
      <Stack.Screen
        name={Routes.CARD.HOME}
        component={CardHome}
        options={CardHome.navigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.WELCOME}
        component={CardWelcome}
        options={CardWelcome.navigationOptions}
      />
    </Stack.Navigator>
  </CardSDKProvider>
);

export default CardRoutes;
