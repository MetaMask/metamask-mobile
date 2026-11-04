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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getMfaErrorCode } from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../../core/Engine';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Logger from '../../../../util/Logger';
import { useMfa, type MfaFlowErrorCode } from '../../../../util/identity/mfa';
import { getErrorMessage } from '../../../Views/Mfa/labels';
import { strings } from '../../../../../locales/i18n';
import { VBA_KYC_VENDOR } from '../../Ramp/Views/VirtualBankAccount/constants';
import { useOpenVbaOnboarding } from '../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';

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

/**
 * Submits vendor terms the user accepted before the session existed. A no-op
 * when nothing is stored or it was already submitted.
 */
const submitAcceptedVendorDisclaimers = async (): Promise<void> => {
  const { KycController } = Engine.context;
  const accepted =
    KycController.state.sessions[VBA_KYC_VENDOR]?.vendorDisclaimersAccepted;
  if (!accepted?.disclaimerIds.length || accepted.submitted) {
    return;
  }

  await KycController.recordVendorDisclaimers({ vendor: VBA_KYC_VENDOR });
};

/**
 * Opens a KYC session. Email OTP runs only when no vendor session exists,
 * because creating a session needs an AAL2 token.
 */
const VbaEmailAdapter = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
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
            presentation: 'card',
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

      try {
        await submitAcceptedVendorDisclaimers();
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
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
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
