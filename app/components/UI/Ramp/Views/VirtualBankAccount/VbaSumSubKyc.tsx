import React, { useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
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
  /** Dev preview only. Opens the launch-error view without calling SumSub. */
  initialHasError?: boolean;
}

const VbaSumSubKyc = ({
  onSubmitted,
  initialNeedsMoreInfo = false,
  initialHasError = false,
}: VbaSumSubKycProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { isLaunching, needsMoreInfo, hasError, retry } = useLaunchSumSub(
    onSubmitted,
    initialNeedsMoreInfo,
    initialHasError,
  );

  const handleBack = useCallback(() => {
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
        primaryAction={{
          label: strings('virtual_bank_account.sumsub_kyc.more_info_button'),
          onPress: retry,
          testID: VbaSumSubKycSelectorsIDs.CONTINUE_BUTTON,
        }}
      />
    );
  }

  if (hasError) {
    return (
      <VbaOnboardingError
        testID={VbaSumSubKycSelectorsIDs.ERROR}
        backButtonTestID={VbaSumSubKycSelectorsIDs.BACK_BUTTON}
        onBack={handleBack}
        illustration={
          <VbaIllustration source={VbaIllustrationSource.failure} />
        }
        title={strings('virtual_bank_account.sumsub_kyc.error_title')}
        description={strings(
          'virtual_bank_account.sumsub_kyc.error_description',
        )}
        primaryAction={{
          label: strings('virtual_bank_account.sumsub_kyc.retry'),
          onPress: retry,
          testID: VbaSumSubKycSelectorsIDs.RETRY_BUTTON,
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
      <Box
        twClassName="flex-1"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <ActivityIndicator />
      </Box>
    </SafeAreaView>
  );
};

export default VbaSumSubKyc;
