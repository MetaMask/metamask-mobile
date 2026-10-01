import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Box } from '@metamask/design-system-react-native';
import VbaEmailAdapter from './modules/VbaEmailAdapter';
import VbaIronCustomerDevChip from './VbaIronCustomerDevChip';
import VbaIdentityVerificationModule from './modules/VbaIdentityVerificationModule';
import {
  VbaAccountProvisioningErrorAdapter,
  VbaErrorAdapter,
  VbaKycPendingAdapter,
  VbaKycRejectedAdapter,
} from './modules/VbaStatusAdapters';
import VbaVendorTermsAdapter from './modules/VbaVendorTermsAdapter';
import VbaDetails from './VbaDetails';
import { VbaOnboardingRoutes, type VbaOnboardingParamList } from './routes';

const Stack = createNativeStackNavigator<VbaOnboardingParamList>();

const VbaOnboardingNavigator = () => (
  <Box twClassName="flex-1">
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
      <Stack.Screen name={VbaOnboardingRoutes.DETAILS} component={VbaDetails} />
    </Stack.Navigator>
    {__DEV__ ? <VbaIronCustomerDevChip /> : null}
  </Box>
);

export default VbaOnboardingNavigator;
