import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { PredictCashOut } from '..';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import PredictMarketDetails from '../views/PredictMarketDetails/PredictMarketDetails';
import PredictMarketList from '../views/PredictMarketList/PredictMarketList';
import PredictTabView from '../views/PredictTabView/PredictTabView';

const Stack = createStackNavigator();
const ModalStack = createStackNavigator();

const PredictModalStack = () => (
  <ModalStack.Navigator
    mode="modal"
    screenOptions={{
      headerShown: false,
      cardStyle: {
        backgroundColor: 'transparent',
      },
    }}
  >
    <ModalStack.Screen
      name={Routes.PREDICT.MODALS.CASH_OUT}
      component={PredictCashOut}
    />
  </ModalStack.Navigator>
);

const PredictScreenStack = () => (
  <Stack.Navigator initialRouteName={Routes.PREDICT.ROOT}>
    <Stack.Screen
      name={Routes.PREDICT.ROOT}
      component={PredictTabView}
      options={{
        headerShown: false,
      }}
    />

    <Stack.Screen
      name={Routes.PREDICT.MARKET_LIST}
      component={PredictMarketList}
      options={{
        title: strings('predict.markets.title'),
        headerShown: false,
        animationEnabled: false,
      }}
    />

    <Stack.Screen
      name={Routes.PREDICT.MARKET_DETAILS}
      component={PredictMarketDetails}
      options={{
        title: strings('predict.market.details.title'),
        headerShown: true,
      }}
    />

    <Stack.Screen
      name={Routes.PREDICT.MODALS.ROOT}
      component={PredictModalStack}
      options={{
        headerShown: false,
        cardStyle: {
          backgroundColor: 'transparent',
        },
        animationEnabled: false,
      }}
    />

    <Stack.Screen
      name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
      component={Confirm}
    />
  </Stack.Navigator>
);

export default PredictScreenStack;
export { PredictModalStack };
