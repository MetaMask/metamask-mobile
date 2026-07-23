import React, { useMemo } from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import Routes from '../../../../constants/navigation/Routes';
import CardHome from '../Views/CardHome/CardHome';
import CardWelcome from '../Views/CardWelcome/CardWelcome';
import CardAuthentication from '../Views/CardAuthentication/CardAuthentication';
import SpendingLimit from '../Views/SpendingLimit/SpendingLimit';
import ChooseYourCard from '../Views/ChooseYourCard/ChooseYourCard';
import ReviewOrder from '../Views/ReviewOrder/ReviewOrder';
import OnboardingNavigator from './OnboardingNavigator';
import {
  selectIsCardAuthenticated,
  selectIsCardholder,
} from '../../../../selectors/cardController';
import { useSelector } from 'react-redux';
import { withCardSDK } from '../sdk';
import AddFundsBottomSheet from '../components/AddFundsBottomSheet/AddFundsBottomSheet';
import AssetSelectionBottomSheet from '../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import PasswordBottomSheet from '../components/PasswordBottomSheet';
import RegionSelectorModal from '../components/Onboarding/RegionSelectorModal';
import ConfirmModal from '../components/Onboarding/ConfirmModal';
import RecurringFeeModal from '../components/RecurringFeeModal/RecurringFeeModal';
import DaimoPayModal from '../components/DaimoPayModal/DaimoPayModal';
import ViewPinBottomSheet from '../components/ViewPinBottomSheet';
import SpendingLimitOptionsSheet from '../Views/SpendingLimit/components/SpendingLimitOptionsSheet';
import WaitlistFormModal from '../components/WaitlistFormModal/WaitlistFormModal';
import ImmersveKYCModal from '../components/ImmersveKYCModal/ImmersveKYCModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal/ForgotPasswordModal';
import MoneyUnlinkCardSheet from '../components/MoneyUnlinkCardSheet';
import OrderCompleted from '../Views/OrderCompleted/OrderCompleted';
import Cashback from '../Views/Cashback/Cashback';
import CreditRedeem from '../Views/CreditRedeem/CreditRedeem';
import CreditBalanceTooltipSheet from '../components/CreditBalanceTooltipSheet/CreditBalanceTooltipSheet';
import CreditRefundTooltipSheet from '../components/CreditRefundTooltipSheet/CreditRefundTooltipSheet';
import {
  clearNativeStackNavigatorOptions,
  transparentModalScreenOptions,
} from '../../../../constants/navigation/clearStackNavigatorOptions';
import type {
  CardModalsNavigationParamList,
  CardRootParamList,
  CardScreensStackParamList,
} from '../types/navigation';

const ScreensStack = createNativeStackNavigator<CardScreensStackParamList>();
const RootStack = createNativeStackNavigator<CardRootParamList>();
const ModalsStack = createNativeStackNavigator<CardModalsNavigationParamList>();

// All Card main screens render their own header via HeaderStandard, so hide
// the navigator chrome by default.
const mainScreenOptions: NativeStackNavigationOptions = { headerShown: false };

// SpendingLimit's onboarding flow renders a close (X) header and must not be
// swipe-dismissable; all other flows keep the default gesture behavior.
const spendingLimitScreenOptions = ({
  route,
}: {
  route: {
    params?: CardScreensStackParamList['CardSpendingLimit'];
  };
}): NativeStackNavigationOptions => ({
  headerShown: false,
  gestureEnabled: route.params?.flow !== 'onboarding',
});

const MainRoutes = () => {
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const isCardholder = useSelector(selectIsCardholder);

  const initialRouteName = useMemo(
    () =>
      isAuthenticated || isCardholder ? Routes.CARD.HOME : Routes.CARD.WELCOME,
    [isAuthenticated, isCardholder],
  );

  return (
    <ScreensStack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={mainScreenOptions}
    >
      <ScreensStack.Screen name={Routes.CARD.HOME} component={CardHome} />
      <ScreensStack.Screen name={Routes.CARD.WELCOME} component={CardWelcome} />
      <ScreensStack.Screen
        name={Routes.CARD.CHOOSE_YOUR_CARD}
        component={ChooseYourCard}
      />
      <ScreensStack.Screen
        name={Routes.CARD.REVIEW_ORDER}
        component={ReviewOrder}
      />
      <ScreensStack.Screen
        name={Routes.CARD.ORDER_COMPLETED}
        component={OrderCompleted}
      />
      <ScreensStack.Screen name={Routes.CARD.CASHBACK} component={Cashback} />
      <ScreensStack.Screen
        name={Routes.CARD.CREDIT_REDEEM}
        component={CreditRedeem}
      />
      <ScreensStack.Screen
        name={Routes.CARD.AUTHENTICATION}
        component={CardAuthentication}
      />
      <ScreensStack.Screen
        name={Routes.CARD.SPENDING_LIMIT}
        component={SpendingLimit}
        options={spendingLimitScreenOptions}
      />
      <ScreensStack.Screen
        name={Routes.CARD.ONBOARDING.ROOT}
        component={OnboardingNavigator}
      />
    </ScreensStack.Navigator>
  );
};

const CardModalsRoutes = () => (
  <ModalsStack.Navigator
    screenOptions={{
      ...clearNativeStackNavigatorOptions,
      ...transparentModalScreenOptions,
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
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.PASSWORD}
      component={PasswordBottomSheet}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.RECURRING_FEE}
      component={RecurringFeeModal}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.DAIMO_PAY}
      component={DaimoPayModal}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.VIEW_PIN}
      component={ViewPinBottomSheet}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.SPENDING_LIMIT_OPTIONS}
      component={SpendingLimitOptionsSheet}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.WAITLIST_FORM}
      component={WaitlistFormModal}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.IMMERSVE_KYC}
      component={ImmersveKYCModal}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.FORGOT_PASSWORD}
      component={ForgotPasswordModal}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.CREDIT_BALANCE_TOOLTIP}
      component={CreditBalanceTooltipSheet}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.CREDIT_REFUND_TOOLTIP}
      component={CreditRefundTooltipSheet}
    />
    <ModalsStack.Screen
      name={Routes.CARD.MODALS.UNLINK_MONEY_ACCOUNT}
      component={MoneyUnlinkCardSheet}
    />
  </ModalsStack.Navigator>
);

const CardRoutes = () => (
  <RootStack.Navigator
    initialRouteName={Routes.CARD.HOME}
    screenOptions={{ headerShown: false }}
  >
    <RootStack.Screen name={Routes.CARD.HOME} component={MainRoutes} />
    <RootStack.Screen
      name={Routes.CARD.MODALS.ID}
      component={CardModalsRoutes}
      options={{
        ...clearNativeStackNavigatorOptions,
        ...transparentModalScreenOptions,
      }}
    />
  </RootStack.Navigator>
);

export default withCardSDK(CardRoutes);
