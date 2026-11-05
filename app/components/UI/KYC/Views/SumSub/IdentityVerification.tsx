import React, { useCallback } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import VerifyIdentity from './VerifyIdentity';
import VbaVerificationPartners from './VerificationPartners';
import { BiometricConsentProvider } from './BiometricConsentContext';
import VbaSumSubKyc from './SumSubKyc';
import { useOpenVbaOnboarding } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import {
  VbaIdentityVerificationRoutes,
  type VbaIdentityVerificationParamList,
  type VbaIdentityVerificationRoute,
  type VbaOnboardingParamList,
  VbaOnboardingRoutes,
} from '../../../Ramp/Views/VirtualBankAccount/routes';
import type { VbaOnboardingSnapshot } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { withScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';

const Stack = createNativeStackNavigator<VbaIdentityVerificationParamList>();

type IdentityVerificationNavigation =
  NativeStackNavigationProp<VbaIdentityVerificationParamList>;

/**
 * Swaps both identity terms screens for the provider step, so Back from
 * Sumsub returns to the caller instead of the terms the user already agreed to.
 */
export const replaceProviderTermsWithProvider = (
  navigation: IdentityVerificationNavigation,
): void => {
  navigation.reset({
    index: 0,
    routes: [{ name: VbaIdentityVerificationRoutes.PROVIDER }],
  });
};

// Screen 1 of 2: MetaMask's terms. Agree and continue opens screen 2.
const ProviderTermsStep = () => {
  const navigation = useNavigation<IdentityVerificationNavigation>();
  const handleContinue = useCallback(
    () => navigation.navigate(VbaIdentityVerificationRoutes.PARTNER_TERMS),
    [navigation],
  );

  return <VerifyIdentity onContinue={handleContinue} />;
};

// Screen 2 of 2: idOS and Sumsub. Agree starts Sumsub; Back returns to screen 1.
const PartnerTermsStep = () => {
  const navigation = useNavigation<IdentityVerificationNavigation>();
  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.replace(VbaIdentityVerificationRoutes.PROVIDER_TERMS);
  }, [navigation]);
  const handleAgree = useCallback(
    () => replaceProviderTermsWithProvider(navigation),
    [navigation],
  );

  return <VbaVerificationPartners onBack={handleBack} onAgree={handleAgree} />;
};

const ProviderStep = () => {
  const advance = useOpenVbaOnboarding('identity-verification-submitted');
  const handleSubmitted = useCallback(() => advance(), [advance]);

  return <VbaSumSubKyc onSubmitted={handleSubmitted} />;
};

const InstrumentedProviderStep = withScreenPerformance(
  ProviderStep,
  KYC_SCREEN_PERFORMANCE_CONFIG,
  KYC_SCREEN_ID.IDENTITY_VERIFICATION_PROVIDER,
);

type Props = NativeStackScreenProps<
  VbaOnboardingParamList,
  typeof VbaOnboardingRoutes.IDENTITY_VERIFICATION
>;

export const getVbaIdentityVerificationInitialRoute = (
  snapshot: VbaOnboardingSnapshot,
): VbaIdentityVerificationRoute =>
  snapshot.sessionDisclaimersComplete
    ? VbaIdentityVerificationRoutes.PROVIDER
    : VbaIdentityVerificationRoutes.PROVIDER_TERMS;

const VbaIdentityVerificationModule = ({ route }: Props) => {
  const initialRouteName = getVbaIdentityVerificationInitialRoute(
    route.params.snapshot,
  );

  return (
    <BiometricConsentProvider>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name={VbaIdentityVerificationRoutes.PROVIDER_TERMS}
          component={ProviderTermsStep}
        />
        <Stack.Screen
          name={VbaIdentityVerificationRoutes.PARTNER_TERMS}
          component={PartnerTermsStep}
        />
        <Stack.Screen
          name={VbaIdentityVerificationRoutes.PROVIDER}
          component={InstrumentedProviderStep}
        />
      </Stack.Navigator>
    </BiometricConsentProvider>
  );
};

export default VbaIdentityVerificationModule;
