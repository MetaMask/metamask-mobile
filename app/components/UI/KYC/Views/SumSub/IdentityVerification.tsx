import React, { useCallback, useContext, createContext } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import VerifyIdentity from './VerifyIdentity';
import PartnerTerms from './PartnerTerms';
import KycSumSub from './SumSubKyc';
import { useOpenVbaOnboarding } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import {
  VbaIdentityVerificationRoutes,
  type VbaIdentityVerificationParamList,
  type VbaIdentityVerificationRoute,
  type VbaOnboardingParamList,
  VbaOnboardingRoutes,
} from '../../../Ramp/Views/VirtualBankAccount/routes';
import type { VbaOnboardingSnapshot } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';
import { withScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';

const Stack = createNativeStackNavigator<VbaIdentityVerificationParamList>();

const KycExitContext = createContext<(() => void) | null>(null);

const useKycExit = (): (() => void) => {
  const onExit = useContext(KycExitContext);
  if (!onExit) {
    throw new Error('KycIdentityVerificationModule requires onExit');
  }
  return onExit;
};

type IdentityVerificationNavigation =
  NativeStackNavigationProp<VbaIdentityVerificationParamList>;

export const openPartnerTerms = (
  navigation: IdentityVerificationNavigation,
  disclaimers: KycCatalogDisclaimerLink[],
): void => {
  navigation.navigate(VbaIdentityVerificationRoutes.PARTNER_TERMS, {
    disclaimers,
  });
};

/**
 * Leaves the provider as the only route, so closing it returns to the caller
 * rather than stepping back through the terms pages the user has already
 * agreed to.
 */
export const resetToProvider = (
  navigation: IdentityVerificationNavigation,
): void => {
  navigation.reset({
    index: 0,
    routes: [{ name: VbaIdentityVerificationRoutes.PROVIDER }],
  });
};

const ProviderTermsStep = () => {
  const navigation = useNavigation<IdentityVerificationNavigation>();
  const onExit = useKycExit();
  const handleContinue = useCallback(
    (disclaimers: KycCatalogDisclaimerLink[]) =>
      openPartnerTerms(navigation, disclaimers),
    [navigation],
  );

  return <VerifyIdentity onContinue={handleContinue} onExit={onExit} />;
};

const PartnerTermsStep = () => {
  const navigation = useNavigation<IdentityVerificationNavigation>();
  const { params } =
    useRoute<
      RouteProp<
        VbaIdentityVerificationParamList,
        typeof VbaIdentityVerificationRoutes.PARTNER_TERMS
      >
    >();
  const handleAgree = useCallback(
    () => resetToProvider(navigation),
    [navigation],
  );
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <PartnerTerms
      disclaimers={params.disclaimers}
      onAgree={handleAgree}
      onBack={handleBack}
    />
  );
};

const ProviderStep = () => {
  const advance = useOpenVbaOnboarding('identity-verification-submitted');
  const onExit = useKycExit();
  const handleSubmitted = useCallback(() => advance(), [advance]);

  return <KycSumSub onSubmitted={handleSubmitted} onExit={onExit} />;
};

const InstrumentedProviderStep = withScreenPerformance(
  ProviderStep,
  KYC_SCREEN_PERFORMANCE_CONFIG,
  KYC_SCREEN_ID.IDENTITY_VERIFICATION_PROVIDER,
);

type Props = NativeStackScreenProps<
  VbaOnboardingParamList,
  typeof VbaOnboardingRoutes.IDENTITY_VERIFICATION
> & {
  onExit: () => void;
};

export const getVbaIdentityVerificationInitialRoute = (
  snapshot: VbaOnboardingSnapshot,
): VbaIdentityVerificationRoute =>
  snapshot.sessionDisclaimersComplete
    ? VbaIdentityVerificationRoutes.PROVIDER
    : VbaIdentityVerificationRoutes.PROVIDER_TERMS;

const KycIdentityVerificationModule = ({ route, onExit }: Props) => {
  const initialRouteName = getVbaIdentityVerificationInitialRoute(
    route.params.snapshot,
  );

  return (
    <KycExitContext.Provider value={onExit}>
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
    </KycExitContext.Provider>
  );
};

export default KycIdentityVerificationModule;
