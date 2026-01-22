import React, { useMemo } from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import CardHome from '../Views/CardHome/CardHome';
import CardWelcome from '../Views/CardWelcome/CardWelcome';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import CardAuthentication from '../Views/CardAuthentication/CardAuthentication';
import SpendingLimit from '../Views/SpendingLimit/SpendingLimit';
import ChooseYourCard from '../Views/ChooseYourCard/ChooseYourCard';
import ReviewOrder from '../Views/ReviewOrder/ReviewOrder';
import OnboardingNavigator from './OnboardingNavigator';
import {
  selectIsAuthenticatedCard,
  selectIsCardholder,
} from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import { withCardSDK } from '../sdk';
import AddFundsBottomSheet from '../components/AddFundsBottomSheet/AddFundsBottomSheet';
import AssetSelectionBottomSheet from '../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import { colors } from '../../../../styles/common';
import RegionSelectorModal from '../components/Onboarding/RegionSelectorModal';
import ConfirmModal from '../components/Onboarding/ConfirmModal';
import RecurringFeeModal from '../components/RecurringFeeModal/RecurringFeeModal';
import DaimoPayModal from '../components/DaimoPayModal/DaimoPayModal';
import OrderCompleted from '../Views/OrderCompleted/OrderCompleted';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';

const Stack = createStackNavigator();
const ModalsStack = createStackNavigator();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: colors.transparent },
  animationEnabled: false,
};

export const headerStyle = StyleSheet.create({
  icon: { marginHorizontal: 16 },
  title: { alignSelf: 'center' },
});

// Default navigation has only back button on the left
export const cardDefaultNavigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}): StackNavigationOptions => ({
  headerLeft: () => (
    <ButtonIcon
      style={headerStyle.icon}
      size={ButtonIconSize.Md}
      iconName={IconName.ArrowLeft}
      onPress={() => navigation.goBack()}
    />
  ),
  headerTitle: () => <View />,
  headerRight: () => <View />,
});

export const cardCloseOnlyNavigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}): StackNavigationOptions => {
  const innerStyles = StyleSheet.create({
    accessories: {
      marginHorizontal: 8,
    },
  });

  return {
    headerLeft: () => <View />,
    headerTitle: () => <View />,
    headerRight: () => (
      <ButtonIcon
        size={ButtonIconSize.Lg}
        iconName={IconName.Close}
        onPress={() => navigation?.goBack()}
        style={innerStyles.accessories}
      />
    ),
  };
};

export const cardSpendingLimitNavigationOptions = ({
  navigation,
  route,
}: {
  navigation: NavigationProp<ParamListBase>;
  route: { params?: { flow?: 'manage' | 'enable' | 'onboarding' } };
}): StackNavigationOptions => {
  const flow = route.params?.flow || 'manage';
  const isOnboardingFlow = flow === 'onboarding';

  return {
    headerLeft: () =>
      isOnboardingFlow ? (
        <View />
      ) : (
        <ButtonIcon
          style={headerStyle.icon}
          size={ButtonIconSize.Md}
          iconName={IconName.ArrowLeft}
          onPress={() => navigation.goBack()}
        />
      ),
    headerTitle: () => <View />,
    headerRight: () =>
      isOnboardingFlow ? (
        <ButtonIcon
          style={headerStyle.icon}
          size={ButtonIconSize.Md}
          iconName={IconName.Close}
          onPress={() => navigation.navigate(Routes.CARD.HOME)}
        />
      ) : (
        <View />
      ),
    gestureEnabled: !isOnboardingFlow,
  };
};

const emptyNavigationOptions = () => ({
  headerLeft: () => <View />,
  headerTitle: () => <View />,
  headerRight: () => <View />,
});

const MainRoutes = () => {
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const isCardholder = useSelector(selectIsCardholder);

  const initialRouteName = useMemo(
    () =>
      isAuthenticated || isCardholder ? Routes.CARD.HOME : Routes.CARD.WELCOME,
    [isAuthenticated, isCardholder],
  );

  return (
    <Stack.Navigator initialRouteName={initialRouteName} headerMode="screen">
      <Stack.Screen
        name={Routes.CARD.HOME}
        component={CardHome}
        options={cardCloseOnlyNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.WELCOME}
        component={CardWelcome}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={Routes.CARD.CHOOSE_YOUR_CARD}
        component={ChooseYourCard}
        options={emptyNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.REVIEW_ORDER}
        component={ReviewOrder}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ORDER_COMPLETED}
        component={OrderCompleted}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.AUTHENTICATION}
        component={CardAuthentication}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.SPENDING_LIMIT}
        component={SpendingLimit}
        options={cardSpendingLimitNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.ROOT}
        component={OnboardingNavigator}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const CardModalsRoutes = () => (
  <ModalsStack.Navigator
    mode="modal"
    screenOptions={clearStackNavigatorOptions}
  >
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.ADD_FUNDS}
      component={AddFundsBottomSheet}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.ASSET_SELECTION}
      component={AssetSelectionBottomSheet}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.REGION_SELECTION}
      component={RegionSelectorModal}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.CONFIRM_MODAL}
      component={ConfirmModal}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.RECURRING_FEE}
      component={RecurringFeeModal}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.DAIMO_PAY}
      component={DaimoPayModal}
    />
  </ModalsStack.Navigator>
);

const CardRoutes = () => (
  <Stack.Navigator initialRouteName={Routes.CARD.HOME} headerMode="none">
    <Stack.Screen name={Routes.CARD.HOME} component={MainRoutes} />
    <Stack.Screen
      name={Routes.CARD.MODALS.ID}
      component={CardModalsRoutes}
      options={{
        ...clearStackNavigatorOptions,
        detachPreviousScreen: false,
      }}
    />
  </Stack.Navigator>
);

export default withCardSDK(CardRoutes);
