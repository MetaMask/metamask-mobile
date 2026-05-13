import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import PredictMarketDetails from '../views/PredictMarketDetails';
import PredictUnavailableModal from '../views/PredictUnavailableModal';
import PredictActivityDetail from '../components/PredictActivityDetail/PredictActivityDetail';
import { PredictNavigationParamList } from '../types/navigation';
import PredictAddFundsModal from '../views/PredictAddFundsModal/PredictAddFundsModal';
import PredictFeed from '../views/PredictFeed';
import PredictGTMModal from '../components/PredictGTMModal';
import { useSelector } from 'react-redux';
import { PredictPreviewSheetProvider } from '../contexts';
import PredictBuyPreview from '../views/PredictBuyPreview/PredictBuyPreview';
import PredictBuyWithAnyToken from '../views/PredictBuyWithAnyToken';
import PredictSellPreview from '../views/PredictSellPreview/PredictSellPreview';
import { selectPredictWithAnyTokenEnabledFlag } from '../selectors/featureFlags';
import {
  clearNativeStackNavigatorOptions,
  transparentModalScreenOptions,
} from '../../../../constants/navigation/clearStackNavigatorOptions';

interface PredictConfirmationRouteParams {
  animationEnabled?: boolean;
}

// Note: native-stack cannot independently customize open vs close timing the way
// JS-stack `transitionSpec` did. When the caller opts out of the open animation,
// disable the screen animation entirely so the transition is instantaneous in
// both directions instead of half-animated.
const getPredictConfirmationScreenOptions = ({
  route,
}: {
  route: {
    params?: PredictConfirmationRouteParams;
  };
}): NativeStackNavigationOptions => {
  const disableOpenAnimation = route.params?.animationEnabled === false;

  return {
    headerLeft: () => null,
    headerShown: true,
    title: '',
    ...(disableOpenAnimation ? { animation: 'none' as const } : {}),
  };
};

const Stack = createNativeStackNavigator<PredictNavigationParamList>();
const ModalStack = createNativeStackNavigator<PredictNavigationParamList>();

const PredictModalStack = () => (
  <ModalStack.Navigator
    screenOptions={{
      ...clearNativeStackNavigatorOptions,
      ...transparentModalScreenOptions,
    }}
  >
    <ModalStack.Screen
      name={Routes.PREDICT.MODALS.UNAVAILABLE}
      component={PredictUnavailableModal}
      options={{ animation: 'fade' }}
    />
    <ModalStack.Screen
      name={Routes.PREDICT.MODALS.GTM_MODAL}
      component={PredictGTMModal}
      options={{ animation: 'fade' }}
    />
    <ModalStack.Screen
      name={Routes.PREDICT.MODALS.ADD_FUNDS_SHEET}
      component={PredictAddFundsModal}
      options={{ animation: 'fade' }}
    />
    <ModalStack.Screen
      name={Routes.PREDICT.ACTIVITY_DETAIL}
      component={PredictActivityDetail}
      options={{
        headerShown: false,
      }}
    />
    <ModalStack.Screen
      name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
      component={Confirm}
      options={getPredictConfirmationScreenOptions}
    />
    <ModalStack.Screen
      name={Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER}
      component={Confirm}
      options={({
        route,
      }: {
        route: { params?: PredictConfirmationRouteParams };
      }) => {
        const disableOpenAnimation = route.params?.animationEnabled === false;

        return {
          headerShown: false,
          ...(disableOpenAnimation ? { animation: 'none' as const } : {}),
        };
      }}
    />
  </ModalStack.Navigator>
);

const PredictScreenStack = () => {
  const payWithAnyTokenEnabled = useSelector(
    selectPredictWithAnyTokenEnabledFlag,
  );
  const BuyPreviewComponent = payWithAnyTokenEnabled
    ? PredictBuyWithAnyToken
    : PredictBuyPreview;

  return (
    <PredictPreviewSheetProvider>
      <Stack.Navigator initialRouteName={Routes.PREDICT.MARKET_LIST}>
        <Stack.Screen
          name={Routes.PREDICT.MARKET_LIST}
          component={PredictFeed}
          options={{
            title: strings('predict.markets.title'),
            headerShown: false,
            animation: 'none',
          }}
        />

        <Stack.Screen
          name={Routes.PREDICT.MODALS.BUY_PREVIEW}
          component={BuyPreviewComponent}
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />

        <Stack.Screen
          name={Routes.PREDICT.MODALS.SELL_PREVIEW}
          component={PredictSellPreview}
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />

        <Stack.Screen
          name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
          component={Confirm}
          options={getPredictConfirmationScreenOptions}
        />

        <Stack.Screen
          name={Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER}
          component={Confirm}
          options={({
            route,
          }: {
            route: { params?: PredictConfirmationRouteParams };
          }) => {
            const disableOpenAnimation =
              route.params?.animationEnabled === false;

            return {
              headerShown: false,
              ...(disableOpenAnimation ? { animation: 'none' as const } : {}),
            };
          }}
        />

        <Stack.Screen
          name={Routes.PREDICT.MARKET_DETAILS}
          component={PredictMarketDetails}
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </PredictPreviewSheetProvider>
  );
};

export default PredictScreenStack;
export { PredictModalStack };
