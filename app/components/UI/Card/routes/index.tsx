import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CardHome from '../Views/CardHome/CardHome';
import { CardSDKProvider } from '../sdk';
import { RootParamList } from '../../../../util/navigation';

const Stack = createStackNavigator<RootParamList>();

const CardRoutes = () => (
  <CardSDKProvider>
    <Stack.Navigator
      initialRouteName={'CardHome'}
      screenOptions={{ headerMode: 'screen' }}
    >
      <Stack.Screen
        name={'CardHome'}
        component={CardHome}
        options={CardHome.navigationOptions}
      />
    </Stack.Navigator>
  </CardSDKProvider>
);

export default CardRoutes;
