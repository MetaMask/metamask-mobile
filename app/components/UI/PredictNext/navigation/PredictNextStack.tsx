import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PredictHome } from '../views/PredictHome/PredictHome';
import { PredictEventDetail } from '../views/PredictEventDetail/PredictEventDetail';
import type { PredictNextStackParamList } from './types';
import { PredictNextRoutes } from './routes';

const Stack = createNativeStackNavigator<PredictNextStackParamList>();

const PredictNextStack = () => (
  <Stack.Navigator
    initialRouteName={PredictNextRoutes.HOME}
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name={PredictNextRoutes.HOME} component={PredictHome} />
    <Stack.Screen
      name={PredictNextRoutes.EVENT_DETAIL}
      component={PredictEventDetail}
    />
  </Stack.Navigator>
);

export default PredictNextStack;
