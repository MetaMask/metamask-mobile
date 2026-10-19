import React, { useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
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
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useLaunchSumSub } from '../../hooks/useLaunchSumSub';
import type { VbaIdentityVerificationCompletion } from './types';

export const VbaSumSubKycSelectorsIDs = {
  CONTAINER: 'vba-sumsub-kyc-container',
  BACK_BUTTON: 'vba-sumsub-kyc-back-button',
  ERROR: 'vba-sumsub-kyc-error',
  RETRY_BUTTON: 'vba-sumsub-kyc-retry-button',
} as const;

/**
 * Host screen for the `KycRequired` stage. It opens the SumSub SDK on mount
 * (via {@link useLaunchSumSub}) and reports the KYC outcome. While
 * launching it shows a spinner (the SDK presents itself over this screen); if
 * the launch fails it surfaces a retryable error instead of bouncing back to
 * the previous screen. Closing the provider before submitting returns to the
 * caller (money home); re-entry relaunches the provider directly. Provider
 * terms are accepted earlier, on Verify Identity.
 */
interface VbaSumSubKycProps {
  onSubmitted: (
    result: VbaIdentityVerificationCompletion,
  ) => void | Promise<void>;
}

const VbaSumSubKyc = ({ onSubmitted }: VbaSumSubKycProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  const handleBack = useCallback(() => {
    // The onboarding stack is reset to this screen plus the caller, and
    // provider terms are replaced so they are not left underneath. Back
    // returns to that caller. Money home is only the fallback when nothing
    // can be popped, such as a cold entry with no history.
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
      return;
    }

    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const { isLaunching, hasError, retry } = useLaunchSumSub(
    onSubmitted,
    handleBack,
  );

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={VbaSumSubKycSelectorsIDs.CONTAINER}
    >
      {isLaunching ? null : (
        <HeaderStandard
          onBack={handleBack}
          backButtonProps={{
            testID: VbaSumSubKycSelectorsIDs.BACK_BUTTON,
          }}
          includesTopInset
        />
      )}
      {hasError ? (
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
