import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PredictHome } from '../views/PredictHome/PredictHome';
import { PredictOrderFlowProvider } from '../views/PredictOrderFlow';
import { PredictEventScreen } from '../views/PredictEvent/PredictEventScreen';
import { PredictFeedScreen } from '../views/PredictFeedScreen/PredictFeedScreen';
import { PredictPortfolioScreen } from '../views/PredictPortfolio/PredictPortfolioScreen';
import { PredictSearchScreen } from '../views/PredictSearch/PredictSearchScreen';
import type { PredictNextStackParamList } from './types';
import { PredictNextRoutes } from './routes';

const Stack = createNativeStackNavigator<PredictNextStackParamList>();

const PredictNextStack = () => (
  <PredictOrderFlowProvider>
    <Stack.Navigator
      initialRouteName={PredictNextRoutes.HOME}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name={PredictNextRoutes.HOME} component={PredictHome} />
      <Stack.Screen
        name={PredictNextRoutes.FEED}
        component={PredictFeedScreen}
      />
      <Stack.Screen
        name={PredictNextRoutes.EVENT}
        component={PredictEventScreen}
      />
      <Stack.Screen
        name={PredictNextRoutes.PORTFOLIO}
        component={PredictPortfolioScreen}
      />
      <Stack.Screen
        name={PredictNextRoutes.SEARCH}
        component={PredictSearchScreen}
      />
    </Stack.Navigator>
  </PredictOrderFlowProvider>
);

export default PredictNextStack;
