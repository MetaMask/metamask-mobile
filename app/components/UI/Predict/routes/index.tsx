import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  clearNativeStackNavigatorOptions,
  transparentModalScreenOptions,
} from '../../../../constants/navigation/clearStackNavigatorOptions';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import { PayWithBottomSheet } from '../../../Views/confirmations/components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet';
import PredictMarketDetails from '../views/PredictMarketDetails';
import PredictUnavailableModal from '../views/PredictUnavailableModal';
import { useEmptyNavHeaderForConfirmations } from '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations';
import PredictActivityDetail from '../components/PredictActivityDetail/PredictActivityDetail';
import { PredictNavigationParamList } from '../types/navigation';
import PredictAddFundsModal from '../views/PredictAddFundsModal/PredictAddFundsModal';
import PredictFeed from '../views/PredictFeed';
import PredictWorldCup from '../views/PredictWorldCup';
import PredictGTMModal from '../components/PredictGTMModal';
import { useSelector } from 'react-redux';
import { PredictPreviewSheetProvider } from '../contexts';
import PredictBuyPreview from '../views/PredictBuyPreview/PredictBuyPreview';
import PredictBuyWithAnyToken from '../views/PredictBuyWithAnyToken';
import PredictSellPreview from '../views/PredictSellPreview/PredictSellPreview';
import { selectPredictWithAnyTokenEnabledFlag } from '../selectors/featureFlags';

const Stack = createNativeStackNavigator<PredictNavigationParamList>();
const ModalStack = createNativeStackNavigator<PredictNavigationParamList>();

const PredictModalStack = () => {
  const emptyNavHeaderOptions = useEmptyNavHeaderForConfirmations();

  return (
    <ModalStack.Navigator
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
        name={Routes.PREDICT.MODALS.GTM_MODAL}
        component={PredictGTMModal}
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
        options={emptyNavHeaderOptions}
      />
      <ModalStack.Screen
        name={Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER}
        component={Confirm}
        options={{ headerShown: false }}
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
          component={PredictFeed}
          options={{
            title: strings('predict.markets.title'),
            animation: 'none',
          }}
        />

        <Stack.Screen
          name={Routes.PREDICT.WORLD_CUP}
          component={PredictWorldCup}
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
          name={Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET}
          component={PayWithBottomSheet}
          options={{
            headerShown: false,
            ...transparentModalScreenOptions,
          }}
        />
      </Stack.Navigator>
    </PredictPreviewSheetProvider>
  );
};

export default PredictScreenStack;
export { PredictModalStack };
