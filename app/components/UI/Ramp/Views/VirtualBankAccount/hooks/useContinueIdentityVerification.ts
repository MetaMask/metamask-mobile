import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';

interface UseContinueIdentityVerificationResult {
  isContinuing: boolean;
  continueToProvider: () => Promise<void>;
}

/**
 * Validates that the session is ready, then advances within the identity
 * module. Session consents are recorded by {@link useLaunchSumSub} immediately
 * before provider launch so the idOS applicant remains valid.
 */
export const useContinueIdentityVerification = (
  onSuccess: () => void | Promise<void>,
): UseContinueIdentityVerificationResult => {
  const [isContinuing, setIsContinuing] = useState(false);

  const continueToProvider = useCallback(async () => {
    if (isContinuing) {
      return;
    }

    setIsContinuing(true);
    try {
      const email = Engine.context.KycController.state.email?.trim();
      if (!email) {
        throw new Error(
          strings('virtual_bank_account.kyc_email.email_not_set_error'),
        );
      }

      await onSuccess();
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
      setIsContinuing(false);
    }
  }, [isContinuing, onSuccess]);

  return { isContinuing, continueToProvider };
};
