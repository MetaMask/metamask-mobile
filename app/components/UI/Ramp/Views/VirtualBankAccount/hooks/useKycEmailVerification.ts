import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';
import { MOCK_SUMSUB_APPLICANT_ACCESS_TOKEN } from '../constants';
import { launchSumSubSdk } from '../launchSumSubSdk';

interface UseKycEmailVerificationResult {
  email: string;
  setEmail: (email: string) => void;
  isVerifying: boolean;
  isContinueDisabled: boolean;
  goBack: () => void;
  startVerification: () => Promise<void>;
}

/** Creates the KYC customer and starts identity verification. */
export const useKycEmailVerification = (): UseKycEmailVerificationResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const trimmedEmail = email.trim();
  const isContinueDisabled = !trimmedEmail || isVerifying;

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const startVerification = useCallback(async () => {
    if (!trimmedEmail || isVerifying) {
      return;
    }

    setIsVerifying(true);
    try {
      await Engine.context.KycController.createVendorCustomer({
        vendor: 'iron',
        email: trimmedEmail,
      });

      // Controller failures may only be reflected in state.
      const { error } = Engine.context.KycController.state;
      if (error) {
        throw new Error(error);
      }

      const result = await launchSumSubSdk({
        accessToken: MOCK_SUMSUB_APPLICANT_ACCESS_TOKEN,
        onTokenExpired: async () => MOCK_SUMSUB_APPLICANT_ACCESS_TOKEN,
      });
      Logger.log('[VBA KYC] Sumsub SDK closed', result);
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
    isVerifying,
    isContinueDisabled,
    goBack,
    startVerification,
  };
};
