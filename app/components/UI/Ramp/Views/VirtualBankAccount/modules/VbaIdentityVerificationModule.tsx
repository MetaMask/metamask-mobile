import React, { useCallback } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type {
  KycCatalogDocument,
  KycConsentDocument,
  KycConsentRecord,
} from '@metamask/kyc-controller';
import VerifyIdentity from '../VerifyIdentity';
import VbaSumSubKyc from '../VbaSumSubKyc';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import {
  VbaIdentityVerificationRoutes,
  type VbaIdentityVerificationParamList,
  type VbaIdentityVerificationRoute,
  type VbaOnboardingParamList,
  VbaOnboardingRoutes,
} from '../routes';
import type { VbaOnboardingSnapshot } from '../vbaOnboardingSnapshot';

const Stack = createNativeStackNavigator<VbaIdentityVerificationParamList>();

const toAcceptedDisclaimerKeys = (
  documents: (KycCatalogDocument | KycConsentDocument)[] | undefined,
): KycConsentRecord[] =>
  (documents ?? []).map(({ key, version }) => ({ key, version }));

const ProviderTermsStep = () => {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<VbaIdentityVerificationParamList>
    >();
  const handleSuccess = useCallback(async () => {
    try {
      const { KycController, KycService } = Engine.context;
      if (!KycService) {
        throw new Error('KYC service is unavailable');
      }

      const country = await KycService.getGeoCountry();
      const catalog = await KycController.fetchSessionDisclaimers({
        country,
      });
      await KycController.recordSessionDisclaimers({
        providerDisclaimersAccepted: toAcceptedDisclaimerKeys(
          catalog.kycProvider,
        ),
        idosDisclaimersAccepted: toAcceptedDisclaimerKeys(catalog.idOS),
        credentialReusabilityConsentGiven: false,
      });

      navigation.navigate(VbaIdentityVerificationRoutes.PROVIDER, {
        initialNeedsMoreInfo: false,
      });
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'vba-kyc', provider: 'sumsub' },
        context: {
          name: 'ProviderTermsStep',
          data: { step: 'recordSessionDisclaimers' },
        },
      });
      throw error;
    }
  }, [navigation]);

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
