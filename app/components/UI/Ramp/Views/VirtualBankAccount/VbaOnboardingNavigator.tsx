import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VbaEmailAdapter from '../../../KYC/Views/EmailAdapter';
import VbaIdentityVerificationModule from '../../../KYC/Views/SumSub/IdentityVerification';
import {
  VbaAccountProvisioningErrorAdapter,
  VbaErrorAdapter,
  VbaIdentityVerifiedAdapter,
  VbaKycPendingAdapter,
  VbaKycRejectedAdapter,
} from './modules/VbaStatusAdapters';
import VbaAccountCreateErrorAdapter from './modules/AccountCreateErrorAdapter';
import VbaVendorTermsAdapter from './modules/VbaVendorTermsAdapter';
import VbaOnboardingLoading from './VbaOnboardingLoading';
import VbaChooseCurrency from './VbaChooseCurrency';
import { VbaOnboardingRoutes, type VbaOnboardingParamList } from './routes';
import { withScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_ID,
  VBA_SCREEN_PERFORMANCE_CONFIG,
} from './vbaScreenPerformance';

const Stack = createNativeStackNavigator<VbaOnboardingParamList>();

const InstrumentedLoading = withScreenPerformance(
  VbaOnboardingLoading,
  VBA_SCREEN_PERFORMANCE_CONFIG,
  VBA_SCREEN_ID.ONBOARDING_LOADING,
);
const InstrumentedEmail = withScreenPerformance(
  VbaEmailAdapter,
  VBA_SCREEN_PERFORMANCE_CONFIG,
  VBA_SCREEN_ID.EMAIL_VERIFICATION,
);
const InstrumentedKycPending = withScreenPerformance(
  VbaKycPendingAdapter,
  VBA_SCREEN_PERFORMANCE_CONFIG,
  VBA_SCREEN_ID.KYC_PENDING,
);
const InstrumentedIdentityVerified = withScreenPerformance(
  VbaIdentityVerifiedAdapter,
  VBA_SCREEN_PERFORMANCE_CONFIG,
  VBA_SCREEN_ID.IDENTITY_VERIFIED,
);
const InstrumentedChooseCurrency = withScreenPerformance(
  VbaChooseCurrency,
  VBA_SCREEN_PERFORMANCE_CONFIG,
  VBA_SCREEN_ID.CHOOSE_CURRENCY,
);
const InstrumentedKycRejected = withScreenPerformance(
  VbaKycRejectedAdapter,
  VBA_SCREEN_PERFORMANCE_CONFIG,
  VBA_SCREEN_ID.KYC_REJECTED,
);
const InstrumentedAccountProvisioningError = withScreenPerformance(
  VbaAccountProvisioningErrorAdapter,
  VBA_SCREEN_PERFORMANCE_CONFIG,
  VBA_SCREEN_ID.ACCOUNT_PROVISIONING_ERROR,
  VBA_SCREEN_CONTENT_STATE.ERROR,
);
const InstrumentedOnboardingError = withScreenPerformance(
  VbaErrorAdapter,
  VBA_SCREEN_PERFORMANCE_CONFIG,
  VBA_SCREEN_ID.ONBOARDING_ERROR,
  VBA_SCREEN_CONTENT_STATE.ERROR,
);

const VbaOnboardingNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
    <Stack.Screen
      name={VbaOnboardingRoutes.VENDOR_TERMS}
      component={VbaVendorTermsAdapter}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.LOADING}
      component={InstrumentedLoading}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.EMAIL}
      component={InstrumentedEmail}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.IDENTITY_VERIFICATION}
      component={VbaIdentityVerificationModule}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.KYC_PENDING}
      component={InstrumentedKycPending}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.IDENTITY_VERIFIED}
      component={InstrumentedIdentityVerified}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.CHOOSE_CURRENCY}
      component={InstrumentedChooseCurrency}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.KYC_REJECTED}
      component={InstrumentedKycRejected}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.ACCOUNT_PROVISIONING_ERROR}
      component={InstrumentedAccountProvisioningError}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.ACCOUNT_CREATE_ERROR}
      component={VbaAccountCreateErrorAdapter}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.ERROR}
      component={InstrumentedOnboardingError}
    />
  </Stack.Navigator>
);

export default VbaOnboardingNavigator;
