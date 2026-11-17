import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { type RouteProp, useRoute } from '@react-navigation/native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  clearNativeStackNavigatorOptions,
  transparentModalScreenOptions,
} from '../../../../constants/navigation/clearStackNavigatorOptions';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import { PayWithBottomSheet } from '../../../Views/confirmations/components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet';
import { PayWithModal } from '../../../Views/confirmations/components/modals/pay-with-modal/pay-with-modal';
import PredictMarketDetails from '../views/PredictMarketDetails';
import PredictUnavailableModal from '../views/PredictUnavailableModal';
import PredictMarketUnavailableModal from '../views/PredictMarketUnavailableModal';
import { useEmptyNavHeaderForConfirmations } from '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations';
import PredictActivityDetail from '../components/PredictActivityDetail/PredictActivityDetail';
import {
  PredictModalsNavigationParamList,
  PredictNavigationParamList,
  PredictStackParamList,
} from '../types/navigation';
import PredictAddFundsModal from '../views/PredictAddFundsModal/PredictAddFundsModal';
import PredictPositionsView from '../views/PredictPositionsView';
import PredictMarketListRoute from './PredictMarketListRoute';
import PredictFeedView from '../views/PredictFeedView';
import { useSelector } from 'react-redux';
import { PredictPreviewSheetProvider } from '../contexts';
import PredictBuyPreview from '../views/PredictBuyPreview/PredictBuyPreview';
import PredictBuyWithAnyToken from '../views/PredictBuyWithAnyToken';
import PredictSellPreview from '../views/PredictSellPreview/PredictSellPreview';
import { selectPredictWithAnyTokenEnabledFlag } from '../selectors/featureFlags';

const Stack = createNativeStackNavigator<PredictStackParamList>();
const ModalStack =
  createNativeStackNavigator<PredictModalsNavigationParamList>();

const PredictModalStack = () => {
  const emptyNavHeaderOptions = useEmptyNavHeaderForConfirmations();
  const route =
    useRoute<
      RouteProp<PredictNavigationParamList, typeof Routes.PREDICT.MODALS.ROOT>
    >();
  /**
   * The screen the caller named with `{ screen: <name> }`, e.g. a deep link
   * landing on Market unavailable.
   *
   * React Navigation applies that param only while it initializes the
   * navigator, and marks the params object consumed so it never applies it
   * again, so a route re-created later with the same object fell back to the
   * first declared screen: `PREDICT_LINK_NOT_FOUND.params` is one object for
   * every link. Starting the stack on that screen keeps every presentation
   * identical, for any nested screen rather than one destination. An unknown
   * name falls back to the first declared screen inside the router.
   */
  const initialRouteName = route.params?.screen;

  return (
    <ModalStack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        ...clearNativeStackNavigatorOptions,
        ...transparentModalScreenOptions,
      }}
    >
      <ModalStack.Screen
        name={Routes.PREDICT.MODALS.UNAVAILABLE}
        component={PredictUnavailableModal}
      />
      <ModalStack.Screen
        name={Routes.PREDICT.MODALS.MARKET_UNAVAILABLE}
        component={PredictMarketUnavailableModal}
      />
      <ModalStack.Screen
        name={Routes.PREDICT.MODALS.ADD_FUNDS_SHEET}
        component={PredictAddFundsModal}
      />
      <ModalStack.Screen
        name={Routes.PREDICT.ACTIVITY_DETAIL}
        component={PredictActivityDetail}
      />
      <ModalStack.Screen
        name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
        component={Confirm}
        options={{ ...emptyNavHeaderOptions, presentation: 'card' }}
      />
      <ModalStack.Screen
        name={Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER}
        component={Confirm}
        options={{ headerShown: false, presentation: 'card' }}
      />
    </ModalStack.Navigator>
  );
};

const PredictScreenStack = () => {
  const payWithAnyTokenEnabled = useSelector(
    selectPredictWithAnyTokenEnabledFlag,
  );
  const emptyNavHeaderOptions = useEmptyNavHeaderForConfirmations();
  const BuyPreviewComponent = payWithAnyTokenEnabled
    ? PredictBuyWithAnyToken
    : PredictBuyPreview;

  return (
    <PredictPreviewSheetProvider>
      <Stack.Navigator
        initialRouteName={Routes.PREDICT.MARKET_LIST}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name={Routes.PREDICT.MARKET_LIST}
          component={PredictMarketListRoute}
          options={{
            title: strings('predict.markets.title'),
            animation: 'none',
          }}
        />

        <Stack.Screen name={Routes.PREDICT.FEED} component={PredictFeedView} />

        <Stack.Screen
          name={Routes.PREDICT.POSITIONS}
          component={PredictPositionsView}
        />

        <Stack.Screen
          name={Routes.PREDICT.MODALS.BUY_PREVIEW}
          component={BuyPreviewComponent}
        />

        <Stack.Screen
          name={Routes.PREDICT.MODALS.SELL_PREVIEW}
          component={PredictSellPreview}
        />

        <Stack.Screen
          name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
          component={Confirm}
          options={emptyNavHeaderOptions}
        />

        <Stack.Screen
          name={Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER}
          component={Confirm}
        />

        <Stack.Screen
          name={Routes.PREDICT.MARKET_DETAILS}
          component={PredictMarketDetails}
        />

        <Stack.Screen
          name={Routes.CONFIRMATION_PAY_WITH_MODAL}
          component={PayWithModal}
          options={{
            ...clearNativeStackNavigatorOptions,
            ...transparentModalScreenOptions,
          }}
        />
        <Stack.Screen
          name={Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET}
          component={PayWithBottomSheet}
          options={{
            ...clearNativeStackNavigatorOptions,
            ...transparentModalScreenOptions,
          }}
        />
      </Stack.Navigator>
    </PredictPreviewSheetProvider>
  );
};

export default PredictScreenStack;
export { PredictModalStack };
