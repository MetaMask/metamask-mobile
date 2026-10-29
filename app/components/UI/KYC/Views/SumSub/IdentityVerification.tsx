import React, { useCallback } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import VerifyIdentity from './VerifyIdentity';
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

export const replaceProviderTermsWithProvider = (
  navigation: IdentityVerificationNavigation,
): void => {
  navigation.replace(VbaIdentityVerificationRoutes.PROVIDER);
};

const ProviderTermsStep = () => {
  const navigation = useNavigation<IdentityVerificationNavigation>();
  const handleSuccess = useCallback(
    () => replaceProviderTermsWithProvider(navigation),
    [navigation],
  );

  return <VerifyIdentity onSuccess={handleSuccess} />;
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
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name={VbaIdentityVerificationRoutes.PROVIDER_TERMS}
        component={ProviderTermsStep}
      />
      <Stack.Screen
        name={VbaIdentityVerificationRoutes.PROVIDER}
        component={InstrumentedProviderStep}
      />
    </Stack.Navigator>
  );
};

export default VbaIdentityVerificationModule;
