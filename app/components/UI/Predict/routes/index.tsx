import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import Routes from '../../../../constants/navigation/Routes';
import PredictMarketList from '../views/PredictMarketList';
import PredictMarketDetails from '../views/PredictMarketDetails';

const Stack = createStackNavigator();

const PredictScreenStack = () => (
  <Stack.Navigator initialRouteName={Routes.PREDICT.ROOT}>
    <Stack.Screen
      name={Routes.PREDICT.MARKET_LIST}
      component={PredictMarketList}
    />
    <Stack.Screen
      name={Routes.PREDICT.MARKET_DETAILS}
      component={PredictMarketDetails}
    />
  </Stack.Navigator>
);

export default PredictScreenStack;
