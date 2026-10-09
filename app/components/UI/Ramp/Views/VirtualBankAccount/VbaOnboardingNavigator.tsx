import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VbaEmailAdapter from './modules/VbaEmailAdapter';
import VbaIdentityVerificationModule from './modules/VbaIdentityVerificationModule';
import {
  VbaAccountProvisioningErrorAdapter,
  VbaErrorAdapter,
  VbaKycPendingAdapter,
  VbaKycRejectedAdapter,
} from './modules/VbaStatusAdapters';
import VbaVendorTermsAdapter from './modules/VbaVendorTermsAdapter';
import { VbaOnboardingRoutes, type VbaOnboardingParamList } from './routes';

const Stack = createNativeStackNavigator<VbaOnboardingParamList>();

const VbaOnboardingNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen
      name={VbaOnboardingRoutes.VENDOR_TERMS}
      component={VbaVendorTermsAdapter}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.EMAIL}
      component={VbaEmailAdapter}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.IDENTITY_VERIFICATION}
      component={VbaIdentityVerificationModule}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.KYC_PENDING}
      component={VbaKycPendingAdapter}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.KYC_REJECTED}
      component={VbaKycRejectedAdapter}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.ACCOUNT_PROVISIONING_ERROR}
      component={VbaAccountProvisioningErrorAdapter}
    />
    <Stack.Screen
      name={VbaOnboardingRoutes.ERROR}
      component={VbaErrorAdapter}
    />
  </Stack.Navigator>
);

export default VbaOnboardingNavigator;
