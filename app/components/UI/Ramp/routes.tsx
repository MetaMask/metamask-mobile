import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import TokenSelection from './Views/TokenSelection';
import BuildQuote from './Views/BuildQuote';
import Checkout from './Views/Checkout';
import V2EnterEmail from './Views/NativeFlow/EnterEmail';
import V2OtpCode from './Views/NativeFlow/OtpCode';
import V2BasicInfo from './Views/NativeFlow/BasicInfo';
import V2EnterAddress from './Views/NativeFlow/EnterAddress';
import V2VerifyIdentity from './Views/NativeFlow/VerifyIdentity';
import V2BankDetails from './Views/NativeFlow/BankDetails';
import V2OrderProcessing from './Views/NativeFlow/OrderProcessing';
import V2KycProcessing from './Views/NativeFlow/KycProcessing';
import V2AdditionalVerification from './Views/NativeFlow/AdditionalVerification';
import UnsupportedTokenModal from './Views/Modals/UnsupportedTokenModal';
import SettingsModal from './Views/Modals/SettingsModal';
import PaymentSelectionModal from './Views/Modals/PaymentSelectionModal';
import TokenNotAvailableModal from './Views/Modals/TokenNotAvailableModal';
import ProviderSelectionModal from './Views/Modals/ProviderSelectionModal';
import ErrorDetailsModal from './Views/Modals/ErrorDetailsModal';
import ProcessingInfoModal from './Views/Modals/ProcessingInfoModal/ProcessingInfoModal';
import SsnInfoModal from './Deposit/Views/Modals/SsnInfoModal';
import RampsOrderDetails from './Views/OrderDetails';
import LockManagerService from '../../../core/LockManagerService';

const RootStack = createStackNavigator();
const Stack = createStackNavigator();
const ModalsStack = createStackNavigator();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

const MainRoutes = () => (
  <Stack.Navigator initialRouteName={Routes.RAMP.TOKEN_SELECTION}>
    <Stack.Screen
      name={Routes.RAMP.TOKEN_SELECTION}
      component={TokenSelection}
    />
    <Stack.Screen name={Routes.RAMP.AMOUNT_INPUT} component={BuildQuote} />
    <Stack.Screen name={Routes.RAMP.ENTER_EMAIL} component={V2EnterEmail} />
    <Stack.Screen name={Routes.RAMP.OTP_CODE} component={V2OtpCode} />
    <Stack.Screen name={Routes.RAMP.BASIC_INFO} component={V2BasicInfo} />
    <Stack.Screen name={Routes.RAMP.ENTER_ADDRESS} component={V2EnterAddress} />
    <Stack.Screen
      name={Routes.RAMP.VERIFY_IDENTITY}
      component={V2VerifyIdentity}
    />
    <Stack.Screen name={Routes.RAMP.BANK_DETAILS} component={V2BankDetails} />
    <Stack.Screen
      name={Routes.RAMP.ORDER_PROCESSING}
      component={V2OrderProcessing}
    />
    <Stack.Screen
      name={Routes.RAMP.KYC_PROCESSING}
      component={V2KycProcessing}
    />
    <Stack.Screen
      name={Routes.RAMP.ADDITIONAL_VERIFICATION}
      component={V2AdditionalVerification}
    />
    <Stack.Screen
      name={Routes.RAMP.CHECKOUT}
      component={Checkout}
      options={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        animationEnabled: false,
        gestureEnabled: false,
        detachPreviousScreen: false,
      }}
    />
    <Stack.Screen
      name={Routes.RAMP.RAMPS_ORDER_DETAILS}
      component={RampsOrderDetails}
    />
  </Stack.Navigator>
);

const TokenListModalsRoutes = () => (
  <ModalsStack.Navigator
    screenOptions={{ ...clearStackNavigatorOptions, presentation: 'modal' }}
  >
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.UNSUPPORTED_TOKEN}
      component={UnsupportedTokenModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.BUILD_QUOTE_SETTINGS}
      component={SettingsModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.PAYMENT_SELECTION}
      component={PaymentSelectionModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE}
      component={TokenNotAvailableModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.PROVIDER_SELECTION}
      component={ProviderSelectionModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.ERROR_DETAILS}
      component={ErrorDetailsModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.PROCESSING_INFO}
      component={ProcessingInfoModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.SSN_INFO}
      component={SsnInfoModal}
    />
  </ModalsStack.Navigator>
);

const TokenListRoutes = () => {
  // Disable auto-lock during Ramps unified buy v2 flow
  // This allows users to minimize the app to check personal details or complete
  // verification steps without being locked out and redirected to wallet home
  useEffect(() => {
    LockManagerService.stopListening();
    return () => {
      LockManagerService.startListening();
    };
  }, []);

  return (
    <RootStack.Navigator
      initialRouteName={Routes.RAMP.TOKEN_SELECTION}
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen
        name={Routes.RAMP.TOKEN_SELECTION}
        component={MainRoutes}
      />
      <RootStack.Screen
        name={Routes.RAMP.MODALS.ID}
        component={TokenListModalsRoutes}
        options={{
          ...clearStackNavigatorOptions,
          detachPreviousScreen: false,
        }}
      />
    </RootStack.Navigator>
  );
};

export default TokenListRoutes;
