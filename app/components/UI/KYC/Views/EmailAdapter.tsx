import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getMfaErrorCode } from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../../core/Engine';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import ReduxService from '../../../../core/redux';
import Logger from '../../../../util/Logger';
import { useMfa, type MfaFlowErrorCode } from '../../../../util/identity/mfa';
import { getErrorMessage } from '../../../Views/Mfa/labels';
import type { RootState } from '../../../../reducers';
import { selectSelectedVbaWalletAddress } from '../../../../selectors/rampsController';
import { strings } from '../../../../../locales/i18n';
import { VBA_KYC_VENDOR } from '../../Ramp/Views/VirtualBankAccount/constants';
import { useOpenVbaOnboarding } from '../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import { getVbaVendorTermsAcceptance } from '../../Ramp/Views/VirtualBankAccount/vbaVendorTermsStorage';

export const VbaEmailAdapterSelectorsIDs = {
  CONTAINER: 'vba-email-adapter-container',
  BACK_BUTTON: 'vba-email-adapter-back-button',
  SPINNER: 'vba-email-adapter-spinner',
  ERROR_MESSAGE: 'vba-email-adapter-error-message',
  RETRY_BUTTON: 'vba-email-adapter-retry-button',
} as const;

const getVerificationErrorMessage = (error: unknown): string => {
  const code = getMfaErrorCode(error);
  if (code) {
    return getErrorMessage(code as MfaFlowErrorCode);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return strings('virtual_bank_account.kyc_email.error_description');
};

const retryRecordVendorDisclaimers = async (
  walletAddress: string | null,
): Promise<void> => {
  if (!walletAddress) {
    return;
  }

  const vendorTermsAcceptance =
    await getVbaVendorTermsAcceptance(walletAddress);
  if (!vendorTermsAcceptance?.disclaimerIds.length) {
    return;
  }

  await Engine.context.KycController.recordVendorDisclaimers({
    disclaimerIds: vendorTermsAcceptance.disclaimerIds,
  });
};

/**
 * Opens a KYC session. Email OTP runs only when no vendor session exists,
 * because creating a session needs an AAL2 token.
 */
const VbaEmailAdapter = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { verifyOrEnroll } = useMfa();
  const advance = useOpenVbaOnboarding('email-complete');
  const [attempt, setAttempt] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleRetry = useCallback(() => {
    setErrorMessage(undefined);
    setAttempt((count) => count + 1);
  }, []);

  useEffect(() => {
    let active = true;

    const verifyEmail = async () => {
      const existingSession =
        await Engine.context.KycController.getSessionStatusForVendor(
          VBA_KYC_VENDOR,
        );
      if (!active) {
        return;
      }

      let aal2Token: string | undefined;
      if (!existingSession) {
        const result = await verifyOrEnroll({
          methods: ['email_otp'],
          verifyWith: 'email_otp',
          reason: {
            operation: 'vba.verifyEmail',
            enrollDescription: strings(
              'virtual_bank_account.kyc_email.enroll_description',
            ),
            verifyDescription: strings(
              'virtual_bank_account.kyc_email.verify_description',
            ),
          },
        });
        if (!active) {
          return;
        }

        aal2Token = result.token?.accessToken;
        if (!aal2Token) {
          throw new Error(
            strings('virtual_bank_account.kyc_email.error_description'),
          );
        }
      }

      await Engine.context.KycController.startSession(
        aal2Token
          ? { vendor: VBA_KYC_VENDOR, aal2Token }
          : { vendor: VBA_KYC_VENDOR },
      );

      const walletAddress = selectSelectedVbaWalletAddress(
        ReduxService.store.getState() as RootState,
      );
      try {
        await retryRecordVendorDisclaimers(walletAddress);
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'vba-kyc', provider: VBA_KYC_VENDOR },
        });
      }

      if (active) {
        await advance();
      }
    };

    verifyEmail().catch((error: unknown) => {
      if (!active) {
        return;
      }
      if (getMfaErrorCode(error) === 'flow_cancelled') {
        navigation.goBack();
        return;
      }

      Logger.error(error as Error, {
        tags: { feature: 'vba-kyc', provider: VBA_KYC_VENDOR },
      });
      setErrorMessage(getVerificationErrorMessage(error));
    });

    return () => {
      active = false;
    };
  }, [advance, attempt, navigation, verifyOrEnroll]);

  if (errorMessage) {
    return (
      <SafeAreaView
        edges={['right', 'bottom', 'left']}
        style={tw.style('flex-1 bg-default')}
        testID={VbaEmailAdapterSelectorsIDs.CONTAINER}
      >
        <HeaderStandard
          onBack={handleBack}
          backButtonProps={{
            testID: VbaEmailAdapterSelectorsIDs.BACK_BUTTON,
          }}
          includesTopInset
        />
        <Box paddingHorizontal={4} twClassName="flex-1">
          <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
            {strings('virtual_bank_account.kyc_email.error_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-2"
            testID={VbaEmailAdapterSelectorsIDs.ERROR_MESSAGE}
          >
            {errorMessage}
          </Text>
        </Box>
        <Box twClassName="p-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleRetry}
            testID={VbaEmailAdapterSelectorsIDs.RETRY_BUTTON}
          >
            {strings('virtual_bank_account.error.button')}
          </Button>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={VbaEmailAdapterSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          testID: VbaEmailAdapterSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <Box
        twClassName="flex-1"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <ActivityIndicator testID={VbaEmailAdapterSelectorsIDs.SPINNER} />
      </Box>
    </SafeAreaView>
  );
};

export default VbaEmailAdapter;
