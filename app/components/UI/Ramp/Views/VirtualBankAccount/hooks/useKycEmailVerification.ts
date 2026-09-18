/* eslint-disable no-console -- Temporary VBA KYC flow diagnostics. */
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { VBA_KYC_VENDOR } from '../constants';

interface UseKycEmailVerificationResult {
  email: string;
  setEmail: (email: string) => void;
  isVerifying: boolean;
  isContinueDisabled: boolean;
  goBack: () => void;
  startVerification: () => Promise<void>;
  resetKyc: () => Promise<void>;
}

/** Starts or resumes the KYC session, then continues to Get Pix Key. */
export const useKycEmailVerification = (): UseKycEmailVerificationResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const trimmedEmail = email.trim();
  const isContinueDisabled = !trimmedEmail || isVerifying;

  const goBack = useCallback(() => {
    console.log('[VBA KYC][Email] Back pressed');
    navigation.goBack();
  }, [navigation]);

  const startVerification = useCallback(async () => {
    if (!trimmedEmail || isVerifying) {
      console.log('[VBA KYC][Email] Start skipped', {
        hasEmail: Boolean(trimmedEmail),
        isVerifying,
      });
      return;
    }

    console.log('[VBA KYC][Email] Starting KYC session');
    setIsVerifying(true);
    try {
      const sessionStatus = await Engine.context.KycController.startSession({
        vendor: VBA_KYC_VENDOR,
        email: trimmedEmail,
      });

      console.log('[VBA KYC][Email] KYC session ready', {
        finalStatus: sessionStatus.finalStatus,
      });
      console.log('[VBA KYC][Email] Navigating to Get Pix Key');
      navigation.navigate(Routes.RAMP.GET_PIX_KEY);
    } catch (error) {
      console.log('[VBA KYC][Email] Failed to start KYC session', error);
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
      console.log('[VBA KYC][Email] Start request finished');
      setIsVerifying(false);
    }
  }, [isVerifying, navigation, trimmedEmail]);

  const resetKyc = useCallback(async () => {
    console.log('[VBA KYC][Email] Resetting KYC controller');
    try {
      await Engine.context.KycController.reset();
      setEmail('');
      console.log('[VBA KYC][Email] KYC controller reset');
    } catch (error) {
      console.log('[VBA KYC][Email] Failed to reset KYC controller', error);
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
