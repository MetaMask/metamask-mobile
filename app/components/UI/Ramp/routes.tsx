import React from 'react';
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
import ProviderPickerModal from './Views/Modals/ProviderPickerModal';

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
  <Stack.Navigator
    initialRouteName={Routes.RAMP.TOKEN_SELECTION}
    headerMode="screen"
  >
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
  </Stack.Navigator>
);

const TokenListModalsRoutes = () => (
  <ModalsStack.Navigator
    mode="modal"
    screenOptions={clearStackNavigatorOptions}
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
      name={Routes.RAMP.MODALS.PROVIDER_PICKER}
      component={ProviderPickerModal}
    />
  </ModalsStack.Navigator>
);

const TokenListRoutes = () => (
  <RootStack.Navigator
    initialRouteName={Routes.RAMP.TOKEN_SELECTION}
    headerMode="none"
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

export default TokenListRoutes;
