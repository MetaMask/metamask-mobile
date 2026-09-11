import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type {
  KycCatalogDocument,
  KycConsentDocument,
  KycConsentRecord,
} from '@metamask/kyc-controller';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';
import {
  VBA_KYC_COUNTRY_CODE,
  VBA_KYC_PRODUCT,
  VBA_KYC_VENDOR,
  VBA_PARTNER_IDENTITY_AUDIENCE,
  VBA_PARTNER_IDENTITY_CLAIMS,
} from '../constants';
import { emailFromPartnerIdentityToken } from '../utils/partnerIdentityEmail';

interface UseKycEmailVerificationResult {
  email: string;
  setEmail: (email: string) => void;
  showEmailField: boolean;
  isVerifying: boolean;
  isContinueDisabled: boolean;
  goBack: () => void;
  startVerification: () => Promise<void>;
}

const consentRecordsFromDocuments = (
  documents: (KycCatalogDocument | KycConsentDocument)[] | undefined,
): KycConsentRecord[] =>
  (documents ?? []).map(({ key, version }) => ({ key, version }));

/**
 * Throws when `KycController` recorded a failure on `state.error` without
 * rejecting. A retry that rewrites the same message still counts as failed.
 *
 * @param step - Controller method that just ran.
 */
const throwIfKycControllerError = (step: string): void => {
  const { error } = Engine.context.KycController.state;
  if (error) {
    Logger.log('[VBA KYC] controller step failed via state.error', {
      step,
      controllerError: error,
    });
    throw new Error(error);
  }
};

/** Creates the KYC customer, posts catalog consents, and starts SumSub. */
export const useKycEmailVerification = (): UseKycEmailVerificationResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const [email, setEmail] = useState('');
  const [hasPartnerEmail, setHasPartnerEmail] = useState(false);
  const [isResolvingPartnerEmail, setIsResolvingPartnerEmail] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const trimmedEmail = email.trim();
  const isContinueDisabled =
    !trimmedEmail || isVerifying || isResolvingPartnerEmail;
  const showEmailField = !isResolvingPartnerEmail && !hasPartnerEmail;

  useEffect(() => {
    let cancelled = false;

    const loadPartnerEmail = async () => {
      try {
        const partnerIdentityToken =
          await Engine.context.AuthenticationController.getPartnerIdentityToken(
            VBA_PARTNER_IDENTITY_CLAIMS,
            VBA_PARTNER_IDENTITY_AUDIENCE,
          );
        const partnerEmail =
          emailFromPartnerIdentityToken(partnerIdentityToken);
        if (!cancelled && partnerEmail) {
          setEmail(partnerEmail);
          setHasPartnerEmail(true);
        }
      } catch (error) {
        // `EmailRequiredError` (no verified email on the profile), a locked
        // wallet, or a signed-out user: fall back to asking for the email.
        Logger.log('[VBA KYC] partner identity email unavailable', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (!cancelled) {
          setIsResolvingPartnerEmail(false);
        }
      }
    };

    loadPartnerEmail();

    return () => {
      cancelled = true;
    };
  }, []);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const startVerification = useCallback(async () => {
    if (!trimmedEmail || isVerifying) {
      return;
    }

    setIsVerifying(true);
    try {
      await Engine.context.KycController.createVendorCustomer({
        vendor: VBA_KYC_VENDOR,
        email: trimmedEmail,
      });
      throwIfKycControllerError('createVendorCustomer');

      if (Engine.context.KycController.state.vendorDisclaimers.length === 0) {
        throw new Error(
          'Terms are not loaded yet. Go back to Get your Pix Key and try again.',
        );
      }

      // Pre-session catalog: `state.sessionDisclaimers` is only populated once a
      // UKYC session exists, which `acceptTermsAndStartSession` creates below.
      const catalog =
        await Engine.context.KycController.fetchSessionDisclaimers({
          country: VBA_KYC_COUNTRY_CODE,
        });

      await Engine.context.KycController.acceptTermsAndStartSession({
        email: trimmedEmail,
        product: VBA_KYC_PRODUCT,
        providerDisclaimersAccepted: consentRecordsFromDocuments(
          catalog.kycProvider,
        ),
        idosDisclaimersAccepted: consentRecordsFromDocuments(catalog.idOS),
      });
      throwIfKycControllerError('acceptTermsAndStartSession');

      if (Engine.context.KycController.state.sumsub.status === 'abandoned') {
        Logger.log('[VBA KYC] Sumsub SDK abandoned');
        return;
      }

      Logger.log('[VBA KYC] Sumsub SDK closed', {
        status: Engine.context.KycController.state.sumsub.status,
      });
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'vba-kyc', provider: 'sumsub' },
      });
      // TODO: error handling should be displayed in a different way. To be checked with design team.
      Alert.alert(
        strings('virtual_bank_account.kyc_email.error_title'),
        error instanceof Error
          ? error.message
          : strings('virtual_bank_account.kyc_email.error_description'),
      );
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, trimmedEmail]);

  return {
    email,
    setEmail,
    showEmailField,
    isVerifying,
    isContinueDisabled,
    goBack,
    startVerification,
  };
};
