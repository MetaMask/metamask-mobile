import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PredictHome } from '../views/PredictHome/PredictHome';
import { PredictEventDetail } from '../views/PredictEventDetail/PredictEventDetail';
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
      name={PredictNextRoutes.EVENT_DETAIL}
      component={PredictEventDetail}
    />
  </Stack.Navigator>
);

export default PredictNextStack;
