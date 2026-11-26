import React, { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import { fireImpact, ImpactMoment } from '../../../../../util/haptics';
import { useLaunchSumSub } from '../../hooks/useLaunchSumSub';
import VbaFoxLoader from '../../../Ramp/Views/VirtualBankAccount/VbaFoxLoader';
import type { KycIdentityVerificationCompletion } from './types';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

export const KycSumSubSelectorsIDs = {
  CONTAINER: 'kyc-sumsub-container',
  BACK_BUTTON: 'kyc-sumsub-back-button',
  LOADER: 'kyc-sumsub-loader',
} as const;

/**
 * The retryable "Couldn't start verification" native dialog, shown over the
 * fox loader when the provider fails to open. Try again relaunches the
 * provider; Cancel leaves the screen. Exported so other vendors' flows (the
 * Kalshi prototype) show the same dialog.
 */
export const showKycSumSubLaunchError = ({
  onRetry,
  onCancel,
}: {
  onRetry: () => void;
  onCancel: () => void;
}) =>
  Alert.alert(
    strings('kyc.sumsub_kyc.error_title'),
    strings('kyc.sumsub_kyc.error_description'),
    [
      {
        text: strings('kyc.sumsub_kyc.cancel'),
        style: 'cancel',
        onPress: onCancel,
      },
      { text: strings('kyc.sumsub_kyc.retry'), onPress: onRetry },
    ],
    { cancelable: false },
  );

/**
 * Host screen for the `KycRequired` stage. It opens the SumSub SDK on mount
 * (via {@link useLaunchSumSub}) and reports the KYC outcome. While
 * launching it shows the fox loader (the SDK presents itself over this screen); if
 * the launch fails it shows a native retry dialog over the loader instead of
 * bouncing back to the previous screen. Closing the provider before submitting returns to the
 * caller. Re-entry relaunches the provider directly. Provider terms are
 * accepted earlier, on Verify Identity.
 */
interface KycSumSubProps {
  onSubmitted: (
    result: KycIdentityVerificationCompletion,
  ) => void | Promise<void>;
  /** Used when neither this stack nor its parent can pop. */
  onExit: () => void;
}

const KycSumSub = ({ onSubmitted, onExit }: KycSumSubProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  const handleBack = useCallback(() => {
    // The onboarding stack is reset to this screen plus the caller, and
    // provider terms are replaced so they are not left underneath. Back
    // returns to that caller. onExit runs only when nothing can be popped,
    // such as a cold entry with no history.
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
      return;
    }

    onExit();
  }, [navigation, onExit]);

  const { isLaunching, hasError, retry } = useLaunchSumSub(
    onSubmitted,
    handleBack,
  );

  useEffect(() => {
    if (hasError) {
      showKycSumSubLaunchError({
        onRetry: () => {
          fireImpact(ImpactMoment.PrimaryCTA);
          retry();
        },
        onCancel: handleBack,
      });
    }
  }, [hasError, retry, handleBack]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={KycSumSubSelectorsIDs.CONTAINER}
    >
      {isLaunching ? null : (
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          onBack={handleBack}
          backButtonProps={{
            testID: KycSumSubSelectorsIDs.BACK_BUTTON,
          }}
          includesTopInset
        />
      )}
      <Box
        twClassName="flex-1"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <VbaFoxLoader testID={KycSumSubSelectorsIDs.LOADER} />
      </Box>
    </SafeAreaView>
  );
};

export default KycSumSub;
