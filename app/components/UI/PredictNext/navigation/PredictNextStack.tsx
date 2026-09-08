import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PredictHome } from '../views/PredictHome/PredictHome';
import { PredictEventScreen } from '../views/PredictEvent/PredictEventScreen';
import { PredictFeedScreen } from '../views/PredictFeedScreen/PredictFeedScreen';
import type { PredictNextHomeParams, PredictNextStackParamList } from './types';
import { PredictNextRoutes } from './routes';

const Stack = createNativeStackNavigator<PredictNextStackParamList>();

interface PredictNextStackProps {
  initialParams?: PredictNextHomeParams;
}

const PredictNextStack = ({ initialParams }: PredictNextStackProps) => (
  <Stack.Navigator
    initialRouteName={PredictNextRoutes.HOME}
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen
      name={PredictNextRoutes.HOME}
      component={PredictHome}
      initialParams={initialParams}
    />
    <Stack.Screen name={PredictNextRoutes.FEED} component={PredictFeedScreen} />
    <Stack.Screen
      name={PredictNextRoutes.EVENT}
      component={PredictEventScreen}
    />
  </Stack.Navigator>
);

export default PredictNextStack;
