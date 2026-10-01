import React, { useCallback } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import VerifyIdentity from '../VerifyIdentity';
import VbaKycNeedInfo from '../VbaKycNeedInfo';
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

const NeedInfoStep = () => {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<VbaIdentityVerificationParamList>
    >();
  const handleContinue = useCallback(
    () =>
      navigation.navigate(VbaIdentityVerificationRoutes.PROVIDER, {
        initialNeedsMoreInfo: false,
      }),
    [navigation],
  );

  return <VbaKycNeedInfo onContinue={handleContinue} />;
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
): VbaIdentityVerificationRoute => {
  if (!snapshot.sessionDisclaimersComplete) {
    return VbaIdentityVerificationRoutes.PROVIDER_TERMS;
  }

  if (snapshot.providerFlowStatus === 'abandoned') {
    return VbaIdentityVerificationRoutes.NEED_INFO;
  }

  return VbaIdentityVerificationRoutes.PROVIDER;
};

export const getVbaIdentityVerificationInitialProviderParams =
  (): VbaIdentityVerificationParamList['VbaIdentityVerificationProvider'] => ({
    initialNeedsMoreInfo: false,
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
        name={VbaIdentityVerificationRoutes.NEED_INFO}
        component={NeedInfoStep}
      />
      <Stack.Screen
        name={VbaIdentityVerificationRoutes.PROVIDER}
        component={ProviderStep}
        initialParams={getVbaIdentityVerificationInitialProviderParams()}
      />
    </Stack.Navigator>
  );
};

export default VbaIdentityVerificationModule;
