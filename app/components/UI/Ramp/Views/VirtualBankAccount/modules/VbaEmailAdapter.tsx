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
import {
  getMfaErrorCode,
  type EnrolledCredential,
} from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import ReduxService from '../../../../../../core/redux';
import Logger from '../../../../../../util/Logger';
import { useMfa } from '../../../../../../util/identity/mfa';
import type { RootState } from '../../../../../../reducers';
import { selectSelectedVbaWalletAddress } from '../../../../../../selectors/rampsController';
import { strings } from '../../../../../../../locales/i18n';
import { VBA_KYC_VENDOR } from '../constants';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import { getVbaVendorTermsAcceptance } from '../vbaVendorTermsStorage';

export const VbaEmailAdapterSelectorsIDs = {
  CONTAINER: 'vba-email-adapter-container',
  BACK_BUTTON: 'vba-email-adapter-back-button',
  SPINNER: 'vba-email-adapter-spinner',
  ERROR_MESSAGE: 'vba-email-adapter-error-message',
  RETRY_BUTTON: 'vba-email-adapter-retry-button',
} as const;

const getSessionEmail = (
  credentials: EnrolledCredential[],
  boundEmail: string,
): string => {
  const verifiedEmail = credentials.find(
    (
      credential,
    ): credential is Extract<EnrolledCredential, { type: 'email_otp' }> =>
      credential.type === 'email_otp' &&
      credential.status === 'active' &&
      Boolean(credential.email?.trim()),
  );

  return verifiedEmail?.email?.trim() || boundEmail;
};

/**
 * Logs the verification failure for reporting, and returns the copy shown
 * to the user. The raw error stays in the log.
 */
const getVerificationErrorMessage = (error: unknown): string => {
  const code = getMfaErrorCode(error);
  Logger.error(error as Error, {
    tags: {
      feature: 'vba-kyc',
      provider: VBA_KYC_VENDOR,
      ...(code ? { mfaCode: code } : {}),
    },
  });

  return strings('virtual_bank_account.kyc_email.error_description');
};

/**
 * Opens the VBA KYC session. Pass `aal2Token` only when a session must be
 * created; reusing an existing vendor session omits it.
 *
 * @param email - Address bound to the session.
 * @param aal2Token - AAL2 token from email verification.
 * @returns The current or newly created session status.
 */
const startKycSession = (email: string, aal2Token?: string) =>
  Engine.context.KycController.startSession({
    vendor: VBA_KYC_VENDOR,
    email,
    ...(aal2Token ? { aal2Token } : {}),
  });

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
 * Reuses a vendor KYC session when one already exists and an email is bound,
 * and otherwise verifies email before creating the session.
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

      const boundEmail = Engine.context.KycController.state.email?.trim() ?? '';
      let sessionEmail = existingSession ? boundEmail : '';
      let aal2Token: string | undefined;

      if (!sessionEmail) {
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

        sessionEmail = getSessionEmail(result.credentials, boundEmail);
        aal2Token = result.token?.accessToken;
        if (!sessionEmail || !aal2Token) {
          throw new Error(
            'Missing sessionEmail or aal2Token after email verification',
          );
        }
      }

      await startKycSession(sessionEmail, aal2Token);

      if (!active) {
        return;
      }

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
