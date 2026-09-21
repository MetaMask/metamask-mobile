import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import type {
  KycCatalogDocument,
  KycConsentDocument,
  KycConsentRecord,
} from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';

interface UseKycStartSessionResult {
  isStarting: boolean;
  startSession: () => Promise<void>;
}

const toAcceptedDisclaimerKeys = (
  documents: (KycCatalogDocument | KycConsentDocument)[] | undefined,
): KycConsentRecord[] =>
  (documents ?? []).map(({ key, version }) => ({ key, version }));

/** Records session consents and launches the configured KYC provider flow. */
export const useKycStartSession = (): UseKycStartSessionResult => {
  const [isStarting, setIsStarting] = useState(false);

  const startSession = useCallback(async () => {
    if (isStarting) {
      return;
    }

    setIsStarting(true);
    try {
      const email = Engine.context.KycController.state.email?.trim();
      if (!email) {
        throw new Error(
          strings('virtual_bank_account.kyc_email.email_not_set_error'),
        );
      }

      const kycService = Engine.context.KycService;
      if (!kycService) {
        throw new Error('KYC service is unavailable');
      }

      const country = await kycService.getGeoCountry();
      const catalog =
        await Engine.context.KycController.fetchSessionDisclaimers({
          country,
        });

      await Engine.context.KycController.recordSessionDisclaimers({
        providerDisclaimersAccepted: toAcceptedDisclaimerKeys(
          catalog.kycProvider,
        ),
        idosDisclaimersAccepted: toAcceptedDisclaimerKeys(catalog.idOS),
        credentialReusabilityConsentGiven: false,
      });
      await Engine.context.KycController.launchProviderFlow({});
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'vba-kyc', provider: 'sumsub' },
      });
      Alert.alert(
        strings('virtual_bank_account.kyc_email.error_title'),
        error instanceof Error
          ? error.message
          : strings('virtual_bank_account.kyc_email.error_description'),
      );
    } finally {
      setIsStarting(false);
    }
  }, [isStarting]);

  return { isStarting, startSession };
};
