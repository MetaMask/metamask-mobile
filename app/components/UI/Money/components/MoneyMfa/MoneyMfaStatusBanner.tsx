import React, { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import {
  BannerAlert,
  BannerAlertSeverity,
  BannerBase,
  BoxBackgroundColor,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PendingSpinner from '../PendingSpinner/PendingSpinner';
import type { MoneyMfaStatus } from '../../hooks/useMoneyMfa';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

interface MoneyMfaStatusBannerProps {
  status: MoneyMfaStatus;
  isSettingUpDismissed: boolean;
  onDismissSettingUp: () => void;
  onRetry: () => void;
  onRetrySignIn: () => void;
}

const MoneyMfaStatusBanner = ({
  status,
  isSettingUpDismissed,
  onDismissSettingUp,
  onRetry,
  onRetrySignIn,
}: MoneyMfaStatusBannerProps) => {
  const isSigningIn = status === 'signing_in';
  const isSettingUp = status === 'setting_up' || isSigningIn;
  const isSignInFailed = status === 'sign_in_failed';
  const isVisible =
    isSigningIn ||
    (isSettingUp && !isSettingUpDismissed) ||
    status === 'failed' ||
    isSignInFailed;
  let titleKey = 'money.mfa.failed_title';
  if (isSigningIn) {
    titleKey = 'money.mfa.signing_in_title';
  } else if (isSettingUp) {
    titleKey = 'money.mfa.setting_up_title';
  } else if (isSignInFailed) {
    titleKey = 'money.mfa.sign_in_failed_title';
  }
  const title = strings(titleKey);

  useEffect(() => {
    // Android reads the live region.
    if (isVisible && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(title);
    }
  }, [isVisible, title]);

  if (!isVisible) {
    return null;
  }

  if (isSettingUp) {
    return (
      <BannerBase
        accessibilityLiveRegion="polite"
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
        twClassName="mx-4 mt-2"
        startAccessory={<PendingSpinner size={IconSize.Md} />}
        title={title}
        description={
          isSigningIn ? undefined : strings('money.mfa.setting_up_description')
        }
        descriptionProps={{ color: TextColor.TextAlternative }}
        onClose={isSigningIn ? undefined : onDismissSettingUp}
        closeButtonProps={{
          accessibilityLabel: strings('money.mfa.dismiss'),
          testID: MoneyMfaTestIds.SETTING_UP_BANNER_CLOSE,
        }}
        testID={
          isSigningIn
            ? MoneyMfaTestIds.SIGNING_IN_BANNER
            : MoneyMfaTestIds.SETTING_UP_BANNER
        }
      />
    );
  }

  return (
    <BannerAlert
      accessibilityLiveRegion="polite"
      severity={BannerAlertSeverity.Danger}
      twClassName="mx-4 mt-2"
      title={title}
      description={strings(
        isSignInFailed
          ? 'money.mfa.sign_in_failed_description'
          : 'money.mfa.failed_description',
      )}
      actionButtonLabel={strings('money.mfa.failed_retry')}
      actionButtonOnPress={isSignInFailed ? onRetrySignIn : onRetry}
      actionButtonProps={{
        testID: isSignInFailed
          ? MoneyMfaTestIds.SIGN_IN_FAILED_BANNER_RETRY
          : MoneyMfaTestIds.FAILED_BANNER_RETRY,
      }}
      testID={
        isSignInFailed
          ? MoneyMfaTestIds.SIGN_IN_FAILED_BANNER
          : MoneyMfaTestIds.FAILED_BANNER
      }
    />
  );
};

export default MoneyMfaStatusBanner;
