import React from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { DepositSDKProvider } from '../sdk';

import Root from '../Views/Root';
import BuildQuote from '../Views/BuildQuote';
import EnterEmail from '../Views/EnterEmail';
import OtpCode from '../Views/OtpCode';
import VerifyIdentity from '../Views/VerifyIdentity';
import BasicInfo from '../Views/BasicInfo';
import EnterAddress from '../Views/EnterAddress';
import KycProcessing from '../Views/KycProcessing';
import ProviderWebview from '../Views/ProviderWebview';
import KycWebview from '../Views/KycWebview';
import OrderProcessing from '../Views/OrderProcessing';

import TokenSelectorModal from '../Views/Modals/TokenSelectorModal';
import RegionSelectorModal from '../Views/Modals/RegionSelectorModal';
import PaymentMethodSelectorModal from '../Views/Modals/PaymentMethodSelectorModal';
import UnsupportedRegionModal from '../Views/Modals/UnsupportedRegionModal';

import Routes from '../../../../../constants/navigation/Routes';

interface DepositParamList {
  [key: string]:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
}

const Stack = createStackNavigator<DepositParamList>();
const ModalsStack = createStackNavigator();

const getAnimationOptions = ({
  route,
}: {
  route: RouteProp<DepositParamList, string>;
}): StackNavigationOptions => ({
  animationEnabled: route.params?.animationEnabled !== false,
});

const DepositRoutes = () => (
  <DepositSDKProvider>
    <Stack.Navigator initialRouteName={Routes.DEPOSIT.ROOT}>
      <Stack.Screen
        name={Routes.DEPOSIT.ROOT}
        component={Root}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.BUILD_QUOTE}
        component={BuildQuote}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.ENTER_EMAIL}
        component={EnterEmail}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.OTP_CODE}
        component={OtpCode}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.VERIFY_IDENTITY}
        component={VerifyIdentity}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.BASIC_INFO}
        component={BasicInfo}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.ENTER_ADDRESS}
        component={EnterAddress}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.KYC_WEBVIEW}
        component={KycWebview}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.KYC_PROCESSING}
        component={KycProcessing}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.PROVIDER_WEBVIEW}
        component={ProviderWebview}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.ORDER_PROCESSING}
        component={OrderProcessing}
        options={getAnimationOptions}
      />
    </Stack.Navigator>
  </DepositSDKProvider>
);

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

export const DepositModalsRoutes = () => (
  <ModalsStack.Navigator
    mode="modal"
    screenOptions={clearStackNavigatorOptions}
  >
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.TOKEN_SELECTOR}
      component={TokenSelectorModal}
    />
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.PAYMENT_METHOD_SELECTOR}
      component={PaymentMethodSelectorModal}
    />
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.REGION_SELECTOR}
      component={RegionSelectorModal}
    />
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION}
      component={UnsupportedRegionModal}
    />
  </ModalsStack.Navigator>
);

export default DepositRoutes;
