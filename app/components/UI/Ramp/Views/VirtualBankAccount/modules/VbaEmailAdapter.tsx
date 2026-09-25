import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import ReduxService from '../../../../../../core/redux';
import Logger from '../../../../../../util/Logger';
import type { RootState } from '../../../../../../reducers';
import { selectSelectedVbaWalletAddress } from '../../../../../../selectors/rampsController';
import { strings } from '../../../../../../../locales/i18n';
import { VBA_KYC_VENDOR } from '../constants';
import { getVbaVendorTermsAcceptance } from '../vbaVendorTermsStorage';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import EmailOtpStub from './EmailOtpStub';

const VbaEmailAdapter = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const advance = useOpenVbaOnboarding('email-complete');
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleSuccess = useCallback(
    async (email: string): Promise<void> => {
      try {
        await Engine.context.KycController.startSession({
          vendor: VBA_KYC_VENDOR,
          email,
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

        await advance();
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'vba-kyc', provider: VBA_KYC_VENDOR },
        });
        Alert.alert(
          strings('virtual_bank_account.kyc_email.error_title'),
          error instanceof Error
            ? error.message
            : strings('virtual_bank_account.kyc_email.error_description'),
        );
      }
    },
    [advance],
  );

  return <EmailOtpStub onBack={handleBack} onSuccess={handleSuccess} />;
};

export default VbaEmailAdapter;
