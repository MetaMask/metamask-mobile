import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';
import { VBA_KYC_VENDOR } from '../constants';
import { hydrateAndNavigateVbaOnboarding } from '../hydrateAndNavigateVbaOnboarding';

interface UseKycEmailVerificationResult {
  email: string;
  setEmail: (email: string) => void;
  isVerifying: boolean;
  isContinueDisabled: boolean;
  goBack: () => void;
  startVerification: () => Promise<void>;
}

/** Creates the KYC vendor customer, then rehydrates VBA onboarding to pick the next screen. */
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
        vendor: VBA_KYC_VENDOR,
        email: trimmedEmail,
      });
      await hydrateAndNavigateVbaOnboarding(navigation);
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
      setIsVerifying(false);
    }
  }, [isVerifying, navigation, trimmedEmail]);

  return {
    email,
    setEmail,
    isVerifying,
    isContinueDisabled,
    goBack,
    startVerification,
  };
};
