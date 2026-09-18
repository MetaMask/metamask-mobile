/* eslint-disable no-console -- Temporary VBA KYC flow diagnostics. */
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
import { VBA_KYC_COUNTRY_CODE } from '../constants';

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
      console.log('[VBA KYC][Provider flow] Start skipped: already starting');
      return;
    }

    console.log('[VBA KYC][Provider flow] Starting');
    setIsStarting(true);
    try {
      const email = Engine.context.KycController.state.email?.trim();
      console.log('[VBA KYC][Provider flow] Read controller state', {
        hasEmail: Boolean(email),
        hasSession: Boolean(
          Engine.context.KycController.state.sessionStatus?.id,
        ),
      });
      if (!email) {
        throw new Error(
          strings('virtual_bank_account.kyc_email.email_not_set_error'),
        );
      }

      const catalog =
        await Engine.context.KycController.fetchSessionDisclaimers({
          country: VBA_KYC_COUNTRY_CODE,
        });
      console.log('[VBA KYC][Provider flow] Session disclaimers fetched', {
        idOSCount: catalog.idOS?.length ?? 0,
        providerCount: catalog.kycProvider?.length ?? 0,
      });

      await Engine.context.KycController.recordSessionDisclaimers({
        providerDisclaimersAccepted: toAcceptedDisclaimerKeys(
          catalog.kycProvider,
        ),
        idosDisclaimersAccepted: toAcceptedDisclaimerKeys(catalog.idOS),
        credentialReusabilityConsentGiven: false,
      });
      console.log('[VBA KYC][Provider flow] Session disclaimers recorded');

      console.log('[VBA KYC][Provider flow] Launching provider');
      await Engine.context.KycController.launchProviderFlow({});
      console.log('[VBA KYC][Provider flow] Provider flow closed');
    } catch (error) {
      console.log('[VBA KYC][Provider flow] Failed', error);
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
      console.log('[VBA KYC][Provider flow] Start finished');
      setIsStarting(false);
    }
  }, [isStarting]);

  return { isStarting, startSession };
};
