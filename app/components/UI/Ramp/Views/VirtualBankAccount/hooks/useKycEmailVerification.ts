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
import { getVbaVendorTermsAcceptance } from '../vbaVendorTermsStorage';
import type { VbaEmailCompletion } from '../modules/types';

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
 * Starts or resumes the KYC session, records locally accepted vendor
 * disclaimer ids, then reports completion to the VBA coordinator.
 */
export const useKycEmailVerification = (
  onSuccess: (result: VbaEmailCompletion) => void | Promise<void>,
): UseKycEmailVerificationResult => {
  const navigation = useNavigation<AppNavigationProp>();
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
      const vendorTermsAcceptance = walletAddress
        ? await getVbaVendorTermsAcceptance(walletAddress)
        : null;
      if (vendorTermsAcceptance?.disclaimerIds.length) {
        await Engine.context.KycController.recordVendorDisclaimers({
          disclaimerIds: vendorTermsAcceptance.disclaimerIds,
        });
      } else if (
        !(await Engine.context.KycController.hasCompletedVendorDisclaimers())
      ) {
        throw new Error(
          strings('virtual_bank_account.kyc_email.terms_not_loaded_error'),
        );
      }

      await onSuccess({ email: trimmedEmail });
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
  }, [isVerifying, onSuccess, trimmedEmail]);

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
