import React, { useMemo } from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import CardHome from '../Views/CardHome/CardHome';
import CardWelcome from '../Views/CardWelcome/CardWelcome';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import { StyleSheet, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
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
import VerifyingRegistration from '../components/Onboarding/VerifyingRegistration';
import RegionSelectorModal from '../components/Onboarding/RegionSelectorModal';
import ConfirmModal from '../components/Onboarding/ConfirmModal';

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
      size={ButtonIconSizes.Md}
      iconName={IconName.ArrowLeft}
      onPress={() => navigation.goBack()}
    />
  ),
  headerTitle: () => <View />,
  headerRight: () => <View />,
});

export const cardSpendingLimitNavigationOptions = ({
  navigation,
  route,
}: {
  navigation: { goBack: () => void };
  route: { params?: { flow?: 'manage' | 'enable' } };
}): StackNavigationOptions => {
  const flow = route.params?.flow || 'manage';
  const titleKey =
    flow === 'enable'
      ? 'card.card_spending_limit.title_enable_token'
      : 'card.card_spending_limit.title_change_token';

  return {
    headerLeft: () => (
      <ButtonIcon
        style={headerStyle.icon}
        size={ButtonIconSizes.Md}
        iconName={IconName.ArrowLeft}
        onPress={() => navigation.goBack()}
      />
    ),
    headerTitle: () => (
      <Text
        variant={TextVariant.HeadingSM}
        style={headerStyle.title}
        testID={'spending-limit-title'}
      >
        {strings(titleKey)}
      </Text>
    ),
    headerRight: () => <View />,
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
        options={cardDefaultNavigationOptions}
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
      <Stack.Screen
        name={Routes.CARD.VERIFYING_REGISTRATION}
        component={VerifyingRegistration}
        options={cardDefaultNavigationOptions}
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
