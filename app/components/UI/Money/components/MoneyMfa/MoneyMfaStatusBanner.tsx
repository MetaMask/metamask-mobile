import React, { useEffect, useState } from 'react';
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
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PendingSpinner from '../PendingSpinner/PendingSpinner';
import type { MoneyMfaStatus } from '../../hooks/useMoneyMfa';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

interface MoneyMfaStatusBannerProps {
  status: MoneyMfaStatus;
  onRetry: () => void;
  onDismissFailure: () => void;
}

/**
 * Top-of-Money-home banner while 2-step verification is set up, and when that
 * setup fails.
 *
 * @param props - The banner's props.
 * @param props.status - Money 2-step verification status.
 * @param props.onRetry - Retries the setup.
 * @param props.onDismissFailure - Clears the failed state.
 */
const MoneyMfaStatusBanner = ({
  status,
  onRetry,
  onDismissFailure,
}: MoneyMfaStatusBannerProps) => {
  const [isSettingUpHidden, setIsSettingUpHidden] = useState(false);

  useEffect(() => {
    if (status !== 'setting_up') {
      setIsSettingUpHidden(false);
    }
  }, [status]);

  const isSettingUp = status === 'setting_up';
  if (!(isSettingUp && !isSettingUpHidden) && status !== 'failed') {
    return null;
  }

  return (
    <Box
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
          {strings(
            isSettingUp
              ? 'money.mfa.setting_up_title'
              : 'money.mfa.failed_title',
          )}
        </Text>
        {isSettingUp ? (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('money.mfa.setting_up_description')}
          </Text>
        ) : (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {`${strings('money.mfa.failed_description')} `}
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.PrimaryDefault}
              onPress={onRetry}
              testID={MoneyMfaTestIds.FAILED_BANNER_RETRY}
            >
              {strings('money.mfa.failed_retry')}
            </Text>
          </Text>
        )}
      </Box>
      <ButtonIcon
        iconName={IconName.Close}
        size={ButtonIconSize.Sm}
        accessibilityLabel={strings('money.mfa.cancel')}
        onPress={
          isSettingUp ? () => setIsSettingUpHidden(true) : onDismissFailure
        }
        testID={
          isSettingUp
            ? MoneyMfaTestIds.SETTING_UP_BANNER_CLOSE
            : MoneyMfaTestIds.FAILED_BANNER_CLOSE
        }
      />
    </Box>
  );
};

export default MoneyMfaStatusBanner;
