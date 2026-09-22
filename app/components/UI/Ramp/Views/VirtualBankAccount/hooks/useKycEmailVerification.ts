import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import ReduxService from '../../../../../../core/redux';
import Logger from '../../../../../../util/Logger';
import type { RootState } from '../../../../../../reducers';
import { selectSelectedVbaWalletAddress } from '../../../../../../selectors/rampsController';
import { strings } from '../../../../../../../locales/i18n';
import { VBA_KYC_VENDOR } from '../constants';
import { getVbaTermsOneAcceptance } from '../vbaTermsOneStorage';
import { useAdvanceVbaOnboarding } from './useVbaOnboardingRouting';

interface UseKycEmailVerificationResult {
  email: string;
  setEmail: (email: string) => void;
  isVerifying: boolean;
  isContinueDisabled: boolean;
  goBack: () => void;
  startVerification: () => Promise<void>;
  resetKyc: () => Promise<void>;
}

/**
 * Starts or resumes the KYC session, records the Terms 1 ids accepted locally,
 * then advances to the session-scoped Terms 2 page.
 */
export const useKycEmailVerification = (): UseKycEmailVerificationResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const advanceOnboarding = useAdvanceVbaOnboarding('email');
  const [email, setEmail] = useState(
    () => Engine.context.KycController?.state.email?.trim() ?? '',
  );
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
      await Engine.context.KycController.startSession({
        vendor: VBA_KYC_VENDOR,
        email: trimmedEmail,
      });

      const walletAddress = selectSelectedVbaWalletAddress(
        ReduxService.store.getState() as RootState,
      );
      const termsOneAcceptance = walletAddress
        ? await getVbaTermsOneAcceptance(walletAddress)
        : null;
      if (!termsOneAcceptance?.disclaimerIds.length) {
        throw new Error(
          strings('virtual_bank_account.kyc_email.terms_not_loaded_error'),
        );
      }
      await Engine.context.KycController.recordVendorDisclaimers({
        disclaimerIds: termsOneAcceptance.disclaimerIds,
      });

      advanceOnboarding();
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
  }, [isVerifying, advanceOnboarding, trimmedEmail]);

  const resetKyc = useCallback(async () => {
    try {
      await Engine.context.KycController.reset();
      setEmail('');
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
    }
  }, []);

  return {
    email,
    setEmail,
    isVerifying,
    isContinueDisabled,
    goBack,
    startVerification,
    resetKyc,
  };
};
