import React, { useMemo } from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import CardHome from '../Views/CardHome/CardHome';
import CardWelcome from '../Views/CardWelcome/CardWelcome';
import { strings } from '../../../../../locales/i18n';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { RootParamList } from '../../../../types/navigation';
import { StyleSheet, View } from 'react-native';
import CardAuthentication from '../Views/CardAuthentication/CardAuthentication';
import SpendingLimit from '../Views/SpendingLimit/SpendingLimit';
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
  animation: 'none' as const,
};

export const headerStyle = StyleSheet.create({
  icon: { marginHorizontal: 16 },
  title: { alignSelf: 'center' },
});

// Default navigation has only back button on the left
export const cardDefaultNavigationOptions = ({
  navigation,
}: {
  navigation: { goBack: () => void };
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

const MainRoutes = () => {
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const isCardholder = useSelector(selectIsCardholder);

  const initialRouteName = useMemo(
    () =>
      isAuthenticated || isCardholder ? Routes.CARD.HOME : Routes.CARD.WELCOME,
    [isAuthenticated, isCardholder],
  );

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: true }}
    >
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
    screenOptions={{
      ...clearStackNavigatorOptions,
      presentation: 'transparentModal',
    }}
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
  </ModalsStack.Navigator>
);

const CardRoutes = () => (
  <Stack.Navigator
    initialRouteName={Routes.CARD.HOME}
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name={Routes.CARD.HOME} component={MainRoutes} />
    <Stack.Screen
      name={Routes.CARD.MODALS.ID}
      component={CardModalsRoutes}
      options={{
        ...clearStackNavigatorOptions,
        presentation: 'transparentModal',
        detachPreviousScreen: false,
      }}
    />
  </Stack.Navigator>
);

export default withCardSDK(CardRoutes);
