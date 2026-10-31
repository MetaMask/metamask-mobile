import React, { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextButton,
  TextColor,
  TextVariant,
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

/**
 * Top-of-Money-home banner while 2-step verification is set up, and when that
 * setup fails. Only the setting-up banner can be closed; the failed one stays
 * until a retry succeeds.
 *
 * @param props - The banner's props.
 * @param props.status - Money 2-step verification status.
 * @param props.isSettingUpDismissed - The user closed the setting-up banner.
 * @param props.onDismissSettingUp - Closes the setting-up banner.
 * @param props.onRetry - Retries the setup.
 */
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
    if (isVisible) {
      AccessibilityInfo.announceForAccessibility(title);
    }
  }, [isVisible, title]);

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      accessibilityLiveRegion="polite"
      twClassName={`mx-4 mt-2 flex-row items-start gap-3 rounded-xl p-4 ${
        isSettingUp ? 'bg-muted' : 'bg-error-muted'
      }`}
      testID={
        isSettingUp
          ? MoneyMfaTestIds.SETTING_UP_BANNER
          : MoneyMfaTestIds.FAILED_BANNER
      }
    >
      <Box twClassName="pt-0.5">
        {isSettingUp ? (
          <PendingSpinner size={IconSize.Md} />
        ) : (
          <Icon
            name={IconName.Danger}
            size={IconSize.Md}
            color={IconColor.ErrorDefault}
          />
        )}
      </Box>
      <Box twClassName="flex-1 gap-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
        {isSettingUp ? (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('money.mfa.setting_up_description')}
          </Text>
        ) : (
          <Box twClassName="flex-row flex-wrap gap-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('money.mfa.failed_description')}
            </Text>
            <TextButton
              variant={TextVariant.BodySm}
              onPress={onRetry}
              testID={MoneyMfaTestIds.FAILED_BANNER_RETRY}
            >
              {strings('money.mfa.failed_retry')}
            </TextButton>
          </Box>
        )}
      </Box>
      {isSettingUp && (
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Sm}
          accessibilityLabel={strings('money.mfa.dismiss')}
          onPress={onDismissSettingUp}
          testID={MoneyMfaTestIds.SETTING_UP_BANNER_CLOSE}
        />
      )}
    </Box>
  );
};

export default MoneyMfaStatusBanner;
