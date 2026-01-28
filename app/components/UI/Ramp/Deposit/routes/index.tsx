import React from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { DepositSDKProvider } from '../sdk';
import { DepositNavigationParams } from '../types';

import Root from '../Views/Root';
import BuildQuote from '../Views/BuildQuote';
import EnterEmail from '../Views/EnterEmail';
import OtpCode from '../Views/OtpCode';
import VerifyIdentity from '../Views/VerifyIdentity';
import BasicInfo from '../Views/BasicInfo';
import EnterAddress from '../Views/EnterAddress';
import KycProcessing from '../Views/KycProcessing';
import OrderProcessing from '../Views/OrderProcessing';
import BankDetails from '../Views/BankDetails';
import AdditionalVerification from '../Views/AdditionalVerification';

import TokenSelectorModal from '../Views/Modals/TokenSelectorModal';
import RegionSelectorModal from '../Views/Modals/RegionSelectorModal';
import PaymentMethodSelectorModal from '../Views/Modals/PaymentMethodSelectorModal';
import UnsupportedRegionModal from '../Views/Modals/UnsupportedRegionModal';
import UnsupportedStateModal from '../Views/Modals/UnsupportedStateModal/UnsupportedStateModal';
import StateSelectorModal from '../Views/Modals/StateSelectorModal';
import WebviewModal, { KycWebviewModal } from '../Views/Modals/WebviewModal';
import IncompatibleAccountTokenModal from '../Views/Modals/IncompatibleAccountTokenModal';
import SsnInfoModal from '../Views/Modals/SsnInfoModal';
import ConfigurationModal from '../Views/Modals/ConfigurationModal';
import ErrorDetailsModal from '../Views/Modals/ErrorDetailsModal/ErrorDetailsModal';

import Routes from '../../../../../constants/navigation/Routes';

interface DepositParamList {
  [key: string]:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | DepositNavigationParams
    | undefined;
}

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

const RootStack = createStackNavigator();
const Stack = createStackNavigator<DepositParamList>();
const ModalsStack = createStackNavigator();

const getAnimationOptions = ({
  route,
}: {
  route: RouteProp<DepositParamList, string>;
}): StackNavigationOptions => {
  const params = route.params;
  const animationEnabled =
    params && 'animationEnabled' in params
      ? params.animationEnabled !== false
      : true;
  return { animationEnabled };
};

interface MainRoutesProps {
  route: RouteProp<{ DepositRoot: DepositNavigationParams }, 'DepositRoot'>;
}

const MainRoutes = ({ route }: MainRoutesProps) => {
  const parentParams = route.params;

  return (
    <Stack.Navigator initialRouteName={Routes.DEPOSIT.ROOT}>
      <Stack.Screen
        name={Routes.DEPOSIT.ROOT}
        component={Root}
        initialParams={parentParams}
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
        name={Routes.DEPOSIT.KYC_PROCESSING}
        component={KycProcessing}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.ORDER_PROCESSING}
        component={OrderProcessing}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.BANK_DETAILS}
        component={BankDetails}
        options={getAnimationOptions}
      />
      <Stack.Screen
        name={Routes.DEPOSIT.ADDITIONAL_VERIFICATION}
        component={AdditionalVerification}
        options={getAnimationOptions}
      />
    </Stack.Navigator>
  );
};

const DepositModalsRoutes = () => (
  <ModalsStack.Navigator
    screenOptions={{ ...clearStackNavigatorOptions, presentation: 'modal' }}
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
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE}
      component={UnsupportedStateModal}
    />
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.STATE_SELECTOR}
      component={StateSelectorModal}
    />
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.WEBVIEW}
      component={WebviewModal}
    />
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.KYC_WEBVIEW}
      component={KycWebviewModal}
    />
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.INCOMPATIBLE_ACCOUNT_TOKEN}
      component={IncompatibleAccountTokenModal}
    />
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.SSN_INFO}
      component={SsnInfoModal}
    />
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.CONFIGURATION}
      component={ConfigurationModal}
    />
    <ModalsStack.Screen
      name={Routes.DEPOSIT.MODALS.ERROR_DETAILS}
      component={ErrorDetailsModal}
    />
  </ModalsStack.Navigator>
);

const DepositRoutes = () => (
  <DepositSDKProvider>
    <RootStack.Navigator
      initialRouteName={Routes.DEPOSIT.ROOT}
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen name={Routes.DEPOSIT.ROOT} component={MainRoutes} />
      <RootStack.Screen
        name={Routes.DEPOSIT.MODALS.ID}
        component={DepositModalsRoutes}
        options={{
          ...clearStackNavigatorOptions,
          detachPreviousScreen: false,
        }}
      />
    </RootStack.Navigator>
  </DepositSDKProvider>
);
export default DepositRoutes;
