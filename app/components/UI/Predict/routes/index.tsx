import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import PredictTabView from '../views/PredictTabView/PredictTabView';
import PredictMarketList from '../views/PredictMarketList/PredictMarketList';
import PredictMarketDetails from '../views/PredictMarketDetails/PredictMarketDetails';
import { Confirm } from '../../../Views/confirmations/components/confirm';

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
    <ModalStack.Screen name="EmptyModal" component={() => null} />
  </ModalStack.Navigator>
);

const PredictScreenStack = () => (
  <Stack.Navigator initialRouteName={Routes.PREDICT.ROOT}>
    <Stack.Screen
      name={Routes.PREDICT.ROOT}
      component={PredictTabView}
      options={{
        title: strings('predict.title'),
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
      name="PredictModals"
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
