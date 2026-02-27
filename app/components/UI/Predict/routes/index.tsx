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
import PredictFeed from '../views/PredictFeed';
import PredictGTMModal from '../components/PredictGTMModal';
import { Dimensions } from 'react-native';
import { getPredictMarketHeader } from '../hooks';
import { PredictMarketHeaderParams } from '../hooks/usePredictMarketHeader';

interface PredictConfirmationRouteParams {
  animationEnabled?: boolean;
  predictHeader?: PredictMarketHeaderParams;
}

const getConfirmationTransitionSpec = (disableOpenAnimation: boolean) =>
  disableOpenAnimation
    ? {
        open: { animation: 'timing', config: { duration: 0 } },
        close: { animation: 'timing', config: { duration: 300 } },
      }
    : undefined;

const getPredictConfirmationScreenOptions = ({
  route,
  navigation,
}: {
  route: {
    params?: PredictConfirmationRouteParams;
  };
  navigation: {
    goBack: () => void;
  };
}) => {
  const disableOpenAnimation = route.params?.animationEnabled === false;
  const predictHeader = route.params?.predictHeader;

  if (!predictHeader) {
    return {
      headerLeft: () => null,
      headerShown: true,
      title: '',
      transitionSpec: getConfirmationTransitionSpec(disableOpenAnimation),
    };
  }

  const overrides = getPredictMarketHeader(predictHeader);
  const onBackPress = () => navigation.goBack();

  return {
    title: strings('confirm.title.predict_deposit'),
    headerTitleAlign: overrides.headerTitleAlign ?? 'left',
    headerTitle: overrides.headerTitle,
    headerLeft: overrides.headerLeft
      ? () => overrides.headerLeft?.(onBackPress)
      : () => null,
    headerRight: overrides.headerRight
      ? () => overrides.headerRight?.(onBackPress)
      : () => null,
    headerStyle: {
      shadowColor: 'transparent',
      elevation: 0,
      ...overrides.headerStyle,
    },
    headerShown: true,
    transitionSpec: getConfirmationTransitionSpec(disableOpenAnimation),
  };
};

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
      options={{
        cardStyleInterpolator: ({ current }) => ({
          cardStyle: {
            opacity: current.progress,
          },
        }),
      }}
    />
    <ModalStack.Screen
      name={Routes.PREDICT.MODALS.GTM_MODAL}
      component={PredictGTMModal}
      options={{
        cardStyleInterpolator: ({ current }) => ({
          cardStyle: {
            opacity: current.progress,
          },
        }),
      }}
    />
    <ModalStack.Screen
      name={Routes.PREDICT.MODALS.ADD_FUNDS_SHEET}
      component={PredictAddFundsModal}
      options={{
        cardStyleInterpolator: ({ current }) => ({
          cardStyle: {
            opacity: current.progress,
          },
        }),
      }}
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
      options={({ route }) => {
        const disableOpenAnimation = route.params?.animationEnabled === false;

        return {
          headerShown: false,
          transitionSpec: getConfirmationTransitionSpec(disableOpenAnimation),
        };
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
      options={getPredictConfirmationScreenOptions}
    />

    <Stack.Screen
      name={Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER}
      component={Confirm}
      options={({ route }) => {
        const disableOpenAnimation = route.params?.animationEnabled === false;

        return {
          headerShown: false,
          transitionSpec: getConfirmationTransitionSpec(disableOpenAnimation),
        };
      }}
    />

    <Stack.Screen
      name={Routes.PREDICT.MARKET_DETAILS}
      component={PredictMarketDetails}
      options={{
        headerShown: false,
        // slide from right to left when entering
        cardStyleInterpolator: ({ current }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [Dimensions.get('window').width, 0],
                }),
              },
            ],
          },
        }),
      }}
    />

    <Stack.Screen
      name={Routes.PREDICT.MODALS.BUY_PREVIEW}
      component={PredictBuyPreview}
      options={({ route }) => {
        const disableOpenAnimation = route.params?.animationEnabled === false;

        return {
          headerShown: false,
          transitionSpec: disableOpenAnimation
            ? {
                open: { animation: 'timing', config: { duration: 0 } },
                close: { animation: 'timing', config: { duration: 300 } },
              }
            : undefined,
          // slide from right to left when entering
          cardStyleInterpolator: ({ current }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Dimensions.get('window').width, 0],
                  }),
                },
              ],
            },
          }),
        };
      }}
    />

    <Stack.Screen
      name={Routes.PREDICT.MODALS.SELL_PREVIEW}
      component={PredictSellPreview}
      options={{
        headerShown: false,
        // slide from right to left when entering
        cardStyleInterpolator: ({ current }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [Dimensions.get('window').width, 0],
                }),
              },
            ],
          },
        }),
      }}
    />
  </Stack.Navigator>
);

export default PredictScreenStack;
export { PredictModalStack };
