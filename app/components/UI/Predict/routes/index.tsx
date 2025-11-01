import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import PredictSellPreview from '../views/PredictSellPreview/PredictSellPreview';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import PredictMarketDetails from '../views/PredictMarketDetails';
import PredictUnavailableModal from '../views/PredictUnavailableModal';
import PredictBuyPreview from '../views/PredictBuyPreview/PredictBuyPreview';
import PredictActivityDetail from '../components/PredictActivityDetail/PredictActivityDetail';
import { PredictNavigationParamList } from '../types/navigation';
import PredictAddFundsModal from '../views/PredictAddFundsModal/PredictAddFundsModal';
import PredictFeed from '../views/PredictFeed/PredictFeed';

const Stack = createStackNavigator<PredictNavigationParamList>();
const ModalStack = createStackNavigator<PredictNavigationParamList>();

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
      name={Routes.PREDICT.MODALS.UNAVAILABLE}
      component={PredictUnavailableModal}
    />
    <ModalStack.Screen
      name={Routes.PREDICT.MODALS.ADD_FUNDS_SHEET}
      component={PredictAddFundsModal}
    />
    <ModalStack.Screen
      name={Routes.PREDICT.MARKET_DETAILS}
      component={PredictMarketDetails}
      options={{
        headerShown: false,
      }}
    />
    <ModalStack.Screen
      name={Routes.PREDICT.MODALS.BUY_PREVIEW}
      component={PredictBuyPreview}
    />
    <ModalStack.Screen
      name={Routes.PREDICT.MODALS.SELL_PREVIEW}
      component={PredictSellPreview}
    />
    <ModalStack.Screen
      name={Routes.PREDICT.ACTIVITY_DETAIL}
      component={PredictActivityDetail}
      options={{
        headerShown: false,
      }}
    />
  </ModalStack.Navigator>
);

const PredictScreenStack = () => (
  <Stack.Navigator initialRouteName={Routes.PREDICT.MARKET_LIST}>
    <Stack.Screen
      name={Routes.PREDICT.MARKET_LIST}
      component={PredictFeed}
      options={{
        title: strings('predict.markets.title'),
        headerShown: false,
        animationEnabled: false,
      }}
    />

    <Stack.Screen
      name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
      component={Confirm}
      options={{
        headerLeft: () => null,
        headerShown: true,
        title: '',
      }}
    />

    <Stack.Screen
      name={Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER}
      component={Confirm}
      options={{
        headerShown: false,
      }}
    />
  </Stack.Navigator>
);

export default PredictScreenStack;
export { PredictModalStack };
