import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import reactQueryService from '../../../core/ReactQueryService/ReactQueryService';
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
import V2KycWebview from './Views/NativeFlow/KycWebview';
import HeadlessHost from './Views/HeadlessHost';
import UnsupportedTokenModal from './Views/Modals/UnsupportedTokenModal';
import SettingsModal from './Views/Modals/SettingsModal';
import PaymentSelectionModal from './Views/Modals/PaymentSelectionModal';
import TokenNotAvailableModal from './Views/Modals/TokenNotAvailableModal';
import ProviderSelectionModal from './Views/Modals/ProviderSelectionModal';
import ErrorDetailsModal from './Views/Modals/ErrorDetailsModal';
import ProcessingInfoModal from './Views/Modals/ProcessingInfoModal/ProcessingInfoModal';
import SsnInfoModal from './Views/Modals/SsnInfoModal';
import StateSelectorModal from './Views/Modals/StateSelectorModal';
import UnsupportedStateModal from './Views/Modals/UnsupportedStateModal';
import PhoneCountrySelectorModal from './Views/Modals/PhoneCountrySelectorModal';
import RampsOrderDetails from './Views/OrderDetails';
import LockManagerService from '../../../core/LockManagerService';
import {
  clearNativeStackNavigatorOptions,
  transparentModalScreenOptions,
} from '../../../constants/navigation/clearStackNavigatorOptions';
import type {
  RampModalsNavigationParamList,
  RampScreensStackParamList,
  RampTokenListRootParamList,
} from './types/navigation';
import { withRampScreenPerformance } from './hooks/useRampScreenPerformance';
import { RAMP_V2_SCREEN_ID } from './constants/rampScreenPerformance';

const RootStack = createNativeStackNavigator<RampTokenListRootParamList>();
const Stack = createNativeStackNavigator<RampScreensStackParamList>();
const ModalsStack = createNativeStackNavigator<RampModalsNavigationParamList>();

const InstrumentedEnterEmail = withRampScreenPerformance(
  V2EnterEmail,
  RAMP_V2_SCREEN_ID.ENTER_EMAIL,
);
const InstrumentedOtpCode = withRampScreenPerformance(
  V2OtpCode,
  RAMP_V2_SCREEN_ID.OTP_CODE,
);
const InstrumentedBasicInfo = withRampScreenPerformance(
  V2BasicInfo,
  RAMP_V2_SCREEN_ID.BASIC_INFO,
);
const InstrumentedEnterAddress = withRampScreenPerformance(
  V2EnterAddress,
  RAMP_V2_SCREEN_ID.ENTER_ADDRESS,
);
const InstrumentedVerifyIdentity = withRampScreenPerformance(
  V2VerifyIdentity,
  RAMP_V2_SCREEN_ID.VERIFY_IDENTITY,
);
const InstrumentedAdditionalVerification = withRampScreenPerformance(
  V2AdditionalVerification,
  RAMP_V2_SCREEN_ID.ADDITIONAL_VERIFICATION,
);
const InstrumentedUnsupportedTokenModal = withRampScreenPerformance(
  UnsupportedTokenModal,
  RAMP_V2_SCREEN_ID.UNSUPPORTED_TOKEN_MODAL,
);
const InstrumentedSettingsModal = withRampScreenPerformance(
  SettingsModal,
  RAMP_V2_SCREEN_ID.SETTINGS_MODAL,
);
const InstrumentedTokenNotAvailableModal = withRampScreenPerformance(
  TokenNotAvailableModal,
  RAMP_V2_SCREEN_ID.TOKEN_NOT_AVAILABLE_MODAL,
);
const InstrumentedErrorDetailsModal = withRampScreenPerformance(
  ErrorDetailsModal,
  RAMP_V2_SCREEN_ID.ERROR_DETAILS_MODAL,
);
const InstrumentedProcessingInfoModal = withRampScreenPerformance(
  ProcessingInfoModal,
  RAMP_V2_SCREEN_ID.PROCESSING_INFO_MODAL,
);
const InstrumentedSsnInfoModal = withRampScreenPerformance(
  SsnInfoModal,
  RAMP_V2_SCREEN_ID.SSN_INFO_MODAL,
);
const InstrumentedPhoneCountrySelectorModal = withRampScreenPerformance(
  PhoneCountrySelectorModal,
  RAMP_V2_SCREEN_ID.PHONE_COUNTRY_SELECTOR_MODAL,
);
const InstrumentedStateSelectorModal = withRampScreenPerformance(
  StateSelectorModal,
  RAMP_V2_SCREEN_ID.STATE_SELECTOR_MODAL,
);
const InstrumentedUnsupportedStateModal = withRampScreenPerformance(
  UnsupportedStateModal,
  RAMP_V2_SCREEN_ID.UNSUPPORTED_STATE_MODAL,
);

const overlayScreenOptions = {
  ...clearNativeStackNavigatorOptions,
  presentation: 'transparentModal' as const,
  gestureEnabled: false,
};

const MainRoutes = () => (
  <Stack.Navigator
    initialRouteName={Routes.RAMP.TOKEN_SELECTION}
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen
      name={Routes.RAMP.TOKEN_SELECTION}
      component={TokenSelection}
    />
    <Stack.Screen name={Routes.RAMP.AMOUNT_INPUT} component={BuildQuote} />
    <Stack.Screen
      name={Routes.RAMP.ENTER_EMAIL}
      component={InstrumentedEnterEmail}
    />
    <Stack.Screen name={Routes.RAMP.OTP_CODE} component={InstrumentedOtpCode} />
    <Stack.Screen
      name={Routes.RAMP.BASIC_INFO}
      component={InstrumentedBasicInfo}
    />
    <Stack.Screen
      name={Routes.RAMP.ENTER_ADDRESS}
      component={InstrumentedEnterAddress}
    />
    <Stack.Screen
      name={Routes.RAMP.VERIFY_IDENTITY}
      component={InstrumentedVerifyIdentity}
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
      component={InstrumentedAdditionalVerification}
    />
    <Stack.Screen
      name={Routes.RAMP.CHECKOUT}
      component={Checkout}
      options={overlayScreenOptions}
    />
    <Stack.Screen
      name={Routes.RAMP.KYC_WEBVIEW}
      component={V2KycWebview}
      options={overlayScreenOptions}
    />
    <Stack.Screen
      name={Routes.RAMP.RAMPS_ORDER_DETAILS}
      component={RampsOrderDetails}
    />
    <Stack.Screen name={Routes.RAMP.HEADLESS_HOST} component={HeadlessHost} />
  </Stack.Navigator>
);

const TokenListModalsRoutes = () => (
  <ModalsStack.Navigator
    screenOptions={{
      ...clearNativeStackNavigatorOptions,
      presentation: 'modal',
    }}
  >
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.UNSUPPORTED_TOKEN}
      component={InstrumentedUnsupportedTokenModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.BUILD_QUOTE_SETTINGS}
      component={InstrumentedSettingsModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.PAYMENT_SELECTION}
      component={PaymentSelectionModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE}
      component={InstrumentedTokenNotAvailableModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.PROVIDER_SELECTION}
      component={ProviderSelectionModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.ERROR_DETAILS}
      component={InstrumentedErrorDetailsModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.PROCESSING_INFO}
      component={InstrumentedProcessingInfoModal}
      options={{
        ...clearNativeStackNavigatorOptions,
        ...transparentModalScreenOptions,
      }}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.SSN_INFO}
      component={InstrumentedSsnInfoModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.PHONE_COUNTRY_SELECTOR}
      component={InstrumentedPhoneCountrySelectorModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.STATE_SELECTOR}
      component={InstrumentedStateSelectorModal}
    />
    <ModalsStack.Screen
      name={Routes.RAMP.MODALS.UNSUPPORTED_STATE}
      component={InstrumentedUnsupportedStateModal}
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
    <QueryClientProvider client={reactQueryService.queryClient}>
      <RootStack.Navigator
        initialRouteName={Routes.RAMP.TOKEN_SELECTION_ROOT}
        screenOptions={{ headerShown: false }}
      >
        <RootStack.Screen
          name={Routes.RAMP.TOKEN_SELECTION_ROOT}
          component={MainRoutes}
        />
        <RootStack.Screen
          name={Routes.RAMP.MODALS.ID}
          component={TokenListModalsRoutes}
          options={{
            ...clearNativeStackNavigatorOptions,
            ...transparentModalScreenOptions,
          }}
        />
      </RootStack.Navigator>
    </QueryClientProvider>
  );
};

export default TokenListRoutes;
