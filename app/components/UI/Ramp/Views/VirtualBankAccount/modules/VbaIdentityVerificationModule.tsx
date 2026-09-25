import React, { useCallback } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import VerifyIdentity from '../VerifyIdentity';
import VbaSumSubKyc from '../VbaSumSubKyc';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import {
  VbaIdentityVerificationRoutes,
  type VbaIdentityVerificationParamList,
  type VbaIdentityVerificationRoute,
  type VbaOnboardingParamList,
  VbaOnboardingRoutes,
} from '../routes';
import type { VbaOnboardingSnapshot } from '../vbaOnboardingSnapshot';

const Stack = createNativeStackNavigator<VbaIdentityVerificationParamList>();

const ProviderTermsStep = () => {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<VbaIdentityVerificationParamList>
    >();
  const handleSuccess = useCallback(
    () =>
      navigation.navigate(VbaIdentityVerificationRoutes.PROVIDER, {
        initialNeedsMoreInfo: false,
      }),
    [navigation],
  );

  return <VerifyIdentity onSuccess={handleSuccess} />;
};

type ProviderStepProps = NativeStackScreenProps<
  VbaIdentityVerificationParamList,
  typeof VbaIdentityVerificationRoutes.PROVIDER
>;

const ProviderStep = ({ route }: ProviderStepProps) => {
  const advance = useOpenVbaOnboarding('identity-verification-submitted');
  const handleSubmitted = useCallback(() => advance(), [advance]);

  return (
    <VbaSumSubKyc
      onSubmitted={handleSubmitted}
      initialNeedsMoreInfo={route.params.initialNeedsMoreInfo}
    />
  );
};

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

export const getVbaIdentityVerificationInitialProviderParams = (
  snapshot: VbaOnboardingSnapshot,
): VbaIdentityVerificationParamList['VbaIdentityVerificationProvider'] => ({
  initialNeedsMoreInfo: snapshot.providerFlowStatus === 'abandoned',
});

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
        component={ProviderStep}
        initialParams={getVbaIdentityVerificationInitialProviderParams(
          route.params.snapshot,
        )}
      />
    </Stack.Navigator>
  );
};

export default VbaIdentityVerificationModule;
