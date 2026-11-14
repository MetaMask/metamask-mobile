import React, { useCallback, useEffect, useState } from 'react';
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
import ReduxService from '../../../../core/redux';
import Logger from '../../../../util/Logger';
import { useMfa, type MfaFlowErrorCode } from '../../../../util/identity/mfa';
import { getErrorMessage } from '../../../Views/Mfa/labels';
import type { RootState } from '../../../../reducers';
import { selectSelectedVbaWalletAddress } from '../../../../selectors/rampsController';
import { strings } from '../../../../../locales/i18n';
import { VBA_KYC_VENDOR } from '../../Ramp/Views/VirtualBankAccount/constants';
import VbaFoxLoader from '../../Ramp/Views/VirtualBankAccount/VbaFoxLoader';
import { useOpenVbaOnboarding } from '../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import { startVbaKycSession } from '../../Ramp/Views/VirtualBankAccount/vbaKycSession';
import { getVbaVendorTermsAcceptance } from '../../Ramp/Views/VirtualBankAccount/vbaVendorTermsStorage';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';

export const KycEmailAdapterSelectorsIDs = {
  CONTAINER: 'kyc-email-adapter-container',
  BACK_BUTTON: 'kyc-email-adapter-back-button',
  SPINNER: 'kyc-email-adapter-spinner',
  ERROR_MESSAGE: 'kyc-email-adapter-error-message',
  RETRY_BUTTON: 'kyc-email-adapter-retry-button',
} as const;

const getVerificationErrorMessage = (error: unknown): string => {
  const code = getMfaErrorCode(error);
  if (code) {
    return getErrorMessage(code as MfaFlowErrorCode);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return strings('kyc.kyc_email.error_description');
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
const KycEmailAdapter = () => {
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
      const existingActiveSession =
        Engine.context.KycController.readSessionStatus();

      let aal2Token: string | undefined;
      if (!existingActiveSession) {
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
          throw new Error(strings('kyc.kyc_email.error_description'));
        }
      }

      await startVbaKycSession(
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
        testID={KycEmailAdapterSelectorsIDs.CONTAINER}
      >
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          onBack={handleBack}
          backButtonProps={{
            testID: KycEmailAdapterSelectorsIDs.BACK_BUTTON,
          }}
          includesTopInset
        />
        <Box paddingHorizontal={4} twClassName="flex-1">
          <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
            {strings('kyc.kyc_email.error_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-2"
            testID={KycEmailAdapterSelectorsIDs.ERROR_MESSAGE}
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
            testID={KycEmailAdapterSelectorsIDs.RETRY_BUTTON}
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
      testID={KycEmailAdapterSelectorsIDs.CONTAINER}
    >
      <Box
        twClassName="flex-1"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <VbaFoxLoader testID={KycEmailAdapterSelectorsIDs.SPINNER} />
      </Box>
    </SafeAreaView>
  );
};

export default KycEmailAdapter;
