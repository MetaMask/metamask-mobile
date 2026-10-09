import React, { useCallback } from 'react';
import { ActivityIndicator, Linking } from 'react-native';
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
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import AppConstants from '../../../../../core/AppConstants';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useLaunchSumSub } from './hooks/useLaunchSumSub';
import type { VbaIdentityVerificationCompletion } from './modules/types';
import VbaIllustration, { VbaIllustrationSource } from './VbaIllustration';
import VbaOnboardingError from './VbaOnboardingError';

export const VbaSumSubKycSelectorsIDs = {
  CONTAINER: 'vba-sumsub-kyc-container',
  BACK_BUTTON: 'vba-sumsub-kyc-back-button',
  MORE_INFO_NEEDED: 'vba-sumsub-kyc-more-info-needed',
  CONTINUE_BUTTON: 'vba-sumsub-kyc-continue-button',
  HELP_BUTTON: 'vba-sumsub-kyc-help-button',
  ERROR: 'vba-sumsub-kyc-error',
  RETRY_BUTTON: 'vba-sumsub-kyc-retry-button',
} as const;

/**
 * Host screen for the `KycRequired` stage. It opens the SumSub SDK on mount
 * (via {@link useLaunchSumSub}) and reports the KYC outcome. While
 * launching it shows a spinner (the SDK presents itself over this screen); if
 * the launch fails it surfaces a retryable error instead of bouncing back to
 * the previous screen. Provider terms are accepted earlier, on Verify Identity.
 */
interface VbaSumSubKycProps {
  onSubmitted: (
    result: VbaIdentityVerificationCompletion,
  ) => void | Promise<void>;
  initialNeedsMoreInfo?: boolean;
}

const VbaSumSubKyc = ({
  onSubmitted,
  initialNeedsMoreInfo = false,
}: VbaSumSubKycProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { isLaunching, needsMoreInfo, hasError, retry } = useLaunchSumSub(
    onSubmitted,
    initialNeedsMoreInfo,
  );

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

  const handleHelp = useCallback(() => {
    Linking.openURL(AppConstants.URLS.SUPPORT).catch(() => undefined);
  }, []);

  if (needsMoreInfo) {
    return (
      <VbaOnboardingError
        testID={VbaSumSubKycSelectorsIDs.MORE_INFO_NEEDED}
        backButtonTestID={VbaSumSubKycSelectorsIDs.BACK_BUTTON}
        onBack={handleBack}
        illustration={
          <VbaIllustration source={VbaIllustrationSource.scanner} />
        }
        title={strings('virtual_bank_account.sumsub_kyc.more_info_title')}
        description={strings(
          'virtual_bank_account.sumsub_kyc.more_info_description',
        )}
        items={[
          {
            id: 'proof-of-address',
            icon: IconName.Home,
            title: strings(
              'virtual_bank_account.sumsub_kyc.more_info_item_title',
            ),
            description: strings(
              'virtual_bank_account.sumsub_kyc.more_info_item_description',
            ),
          },
        ]}
        primaryAction={{
          label: strings('virtual_bank_account.sumsub_kyc.more_info_button'),
          onPress: retry,
          testID: VbaSumSubKycSelectorsIDs.CONTINUE_BUTTON,
        }}
        secondaryAction={{
          label: strings('virtual_bank_account.sumsub_kyc.more_info_help'),
          onPress: handleHelp,
          testID: VbaSumSubKycSelectorsIDs.HELP_BUTTON,
        }}
      />
    );
  }

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
