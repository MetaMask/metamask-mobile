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
}

const MoneyMfaStatusBanner = ({
  status,
  isSettingUpDismissed,
  onDismissSettingUp,
  onRetry,
}: MoneyMfaStatusBannerProps) => {
  const isSettingUp = status === 'setting_up';
  const isVisible =
    (isSettingUp && !isSettingUpDismissed) || status === 'failed';
  const title = strings(
    isSettingUp ? 'money.mfa.setting_up_title' : 'money.mfa.failed_title',
  );

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
        description={strings('money.mfa.setting_up_description')}
        descriptionProps={{ color: TextColor.TextAlternative }}
        onClose={onDismissSettingUp}
        closeButtonProps={{
          accessibilityLabel: strings('money.mfa.dismiss'),
          testID: MoneyMfaTestIds.SETTING_UP_BANNER_CLOSE,
        }}
        testID={MoneyMfaTestIds.SETTING_UP_BANNER}
      />
    );
  }

  return (
    <BannerAlert
      accessibilityLiveRegion="polite"
      severity={BannerAlertSeverity.Danger}
      twClassName="mx-4 mt-2"
      title={title}
      description={strings('money.mfa.failed_description')}
      actionButtonLabel={strings('money.mfa.failed_retry')}
      actionButtonOnPress={onRetry}
      actionButtonProps={{ testID: MoneyMfaTestIds.FAILED_BANNER_RETRY }}
      testID={MoneyMfaTestIds.FAILED_BANNER}
    />
  );
};

export default MoneyMfaStatusBanner;
