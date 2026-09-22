import React from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useLaunchSumSub } from './hooks/useLaunchSumSub';

export const VbaSumSubKycSelectorsIDs = {
  CONTAINER: 'vba-sumsub-kyc-container',
  MORE_INFO_NEEDED: 'vba-sumsub-kyc-more-info-needed',
  CONTINUE_BUTTON: 'vba-sumsub-kyc-continue-button',
  ERROR: 'vba-sumsub-kyc-error',
  RETRY_BUTTON: 'vba-sumsub-kyc-retry-button',
} as const;

/**
 * Host screen for the `KycRequired` stage. It opens the SumSub SDK on mount
 * (via {@link useLaunchSumSub}) and routes onward from the KYC outcome. While
 * launching it shows a spinner (the SDK presents itself over this screen); if
 * the launch fails it surfaces a retryable error instead of bouncing back to
 * the previous screen. Provider terms are accepted earlier, on Verify Identity.
 */
const VbaSumSubKyc = () => {
  const tw = useTailwind();
  const { needsMoreInfo, hasError, retry } = useLaunchSumSub();

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={VbaSumSubKycSelectorsIDs.CONTAINER}
    >
      {needsMoreInfo ? (
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 px-6 gap-3"
          testID={VbaSumSubKycSelectorsIDs.MORE_INFO_NEEDED}
        >
          <Text variant={TextVariant.HeadingMd} twClassName="text-center">
            {strings('virtual_bank_account.sumsub_kyc.more_info_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('virtual_bank_account.sumsub_kyc.more_info_description')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={retry}
            testID={VbaSumSubKycSelectorsIDs.CONTINUE_BUTTON}
            twClassName="mt-2"
          >
            {strings('virtual_bank_account.sumsub_kyc.more_info_button')}
          </Button>
        </Box>
      ) : hasError ? (
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 px-6 gap-3"
          testID={VbaSumSubKycSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.HeadingMd} twClassName="text-center">
            {strings('virtual_bank_account.sumsub_kyc.error_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('virtual_bank_account.sumsub_kyc.error_description')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={retry}
            testID={VbaSumSubKycSelectorsIDs.RETRY_BUTTON}
            twClassName="mt-2"
          >
            {strings('virtual_bank_account.sumsub_kyc.retry')}
          </Button>
        </Box>
      ) : (
        <Box
          twClassName="flex-1"
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
        >
          <ActivityIndicator />
        </Box>
      )}
    </SafeAreaView>
  );
};

export default VbaSumSubKyc;
