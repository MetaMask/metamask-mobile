import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
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
 * Top-of-Money-home banner while the Money account is set up for 2-step
 * verification, and when that setup fails.
 *
 * @param props - The banner's props.
 * @param props.status - Money 2-step verification status.
 * @param props.onRetry - Retries the account setup.
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
      twClassName="mx-4 mt-2 flex-row items-start gap-3 rounded-xl bg-muted p-4"
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
      <Box twClassName="flex-1 items-start gap-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings(
            isSettingUp
              ? 'money.mfa.setting_up_title'
              : 'money.mfa.failed_title',
          )}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings(
            isSettingUp
              ? 'money.mfa.setting_up_description'
              : 'money.mfa.failed_description',
          )}
        </Text>
        {isSettingUp ? null : (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={onRetry}
            twClassName="mt-2"
            testID={MoneyMfaTestIds.FAILED_BANNER_RETRY}
          >
            {strings('money.mfa.failed_retry')}
          </Button>
        )}
      </Box>
      <ButtonIcon
        iconName={IconName.Close}
        size={ButtonIconSize.Sm}
        accessibilityLabel={strings('money.mfa.cancel')}
        onPress={
          isSettingUp ? () => setIsSettingUpHidden(true) : onDismissFailure
        }
        testID={MoneyMfaTestIds.SETTING_UP_BANNER_CLOSE}
      />
    </Box>
  );
};

export default MoneyMfaStatusBanner;
