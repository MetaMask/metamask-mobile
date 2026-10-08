import React, { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatAddress } from '../../../../../util/address';
import useMountEffect from '../../hooks/useMountEffect';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { useMoneyAccountRegistrationStatus } from '../../hooks/useMoneyAccountRegistrationStatus';
import { MoneyAdvancedSettingsViewTestIds } from './MoneyAdvancedSettingsView.testIds';

const MoneyAdvancedSettingsView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const { trackScreenViewed, trackButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_ADVANCED_SETTINGS,
  });
  const status = useMoneyAccountRegistrationStatus();
  useMountEffect(trackScreenViewed);
  const retry = useCallback(async () => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.RETRY_REGISTRATION,
      component_name: COMPONENT_NAMES.MONEY_ADVANCED_SETTINGS_RETRY,
      label_key: 'money.advanced_settings.retry_button',
    });
    await status.retry();
  }, [status, trackButtonClicked]);
  return (
    <Box
      twClassName="flex-1"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      testID={MoneyAdvancedSettingsViewTestIds.CONTAINER}
    >
      <Box twClassName="flex-row items-center justify-between px-1 py-2">
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
          testID={MoneyAdvancedSettingsViewTestIds.BACK_BUTTON}
        />
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('money.advanced_settings.title')}
        </Text>
        <Box twClassName="w-10" />
      </Box>
      <Box twClassName="px-4 pt-6 gap-4">
        <Text variant={TextVariant.BodyMd}>
          {strings('money.advanced_settings.account_label')}:{' '}
          {status.address ? formatAddress(status.address, 'short') : '-'}
        </Text>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('money.advanced_settings.status_label')}
        </Text>
        <Text variant={TextVariant.BodyMd}>
          {strings(`money.advanced_settings.status_${status.status}`)}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('money.advanced_settings.status_disclaimer')}
        </Text>
        {status.completedAt && (
          <Text variant={TextVariant.BodyMd}>
            {strings('money.advanced_settings.registered_on', {
              date: new Date(status.completedAt).toLocaleDateString(),
            })}
          </Text>
        )}
        <Button
          onPress={retry}
          isLoading={status.isRetrying}
          isDisabled={status.isRetrying || status.status === 'unavailable'}
          testID={MoneyAdvancedSettingsViewTestIds.RETRY_BUTTON}
        >
          {strings('money.advanced_settings.retry_button')}
        </Button>
        {status.retryResult && (
          <Text variant={TextVariant.BodyMd}>
            {strings(
              `money.advanced_settings.retry_${status.retryResult.status}`,
            )}
          </Text>
        )}
      </Box>
    </Box>
  );
};
export default MoneyAdvancedSettingsView;
