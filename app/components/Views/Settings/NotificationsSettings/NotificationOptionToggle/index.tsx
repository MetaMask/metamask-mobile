import React, { useCallback } from 'react';
import { ActivityIndicator, Platform, Switch, View } from 'react-native';
import { useMetrics } from '../../../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import { createStyles } from './styles';
import generateTestId from '../../../../../../wdio/utils/generateTestId';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { NotificationsToggleTypes } from '../NotificationsSettings.constants';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import Avatar, {
  AvatarAccountType,
} from '../../../../../component-library/components/Avatars/Avatar';
import { formatAddress } from '../../../../../util/address';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useUpdateAccountSetting } from '../../../../../util/notifications/hooks/useUpdateAccountSetting';

interface NotificationOptionsToggleProps {
  address: string;
  title: string;
  icon?: AvatarAccountType | IconName;
  type?: string;
  testId?: string;
  disabledSwitch?: boolean;
  isLoading?: boolean;
  isEnabled: boolean;
  updateAndfetchAccountSettings: () => Promise<
    Record<string, boolean> | undefined
  >;
}

/**
 * View that renders the toggle for notifications options
 * This component assumes that the parent will manage the state of the toggle. This is because most of the state is global.
 */
const NotificationOptionToggle = ({
  address,
  title,
  icon,
  type,
  testId,
  isEnabled,
  disabledSwitch,
  isLoading,
  updateAndfetchAccountSettings,
}: NotificationOptionsToggleProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();
  const { trackEvent, createEventBuilder } = useMetrics();

  const { toggleAccount, loading: isUpdatingAccount } = useUpdateAccountSetting(
    address,
    updateAndfetchAccountSettings,
  );

  const loading = isLoading || isUpdatingAccount;

  const handleToggleAccountNotifications = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
        .addProperties({
          settings_type: 'account_notifications',
          old_value: isEnabled,
          new_value: !isEnabled,
        })
        .build(),
    );
    await toggleAccount(!isEnabled);
  }, [isEnabled, toggleAccount, trackEvent, createEventBuilder]);

  return (
    <View style={styles.container}>
      {type === NotificationsToggleTypes.ACTIONS && icon ? (
        <Icon
          name={icon as IconName}
          style={styles.icon}
          color={IconColor.Default}
          size={icon === 'Received' ? IconSize.Md : IconSize.Lg}
        />
      ) : (
        <Avatar
          variant={AvatarVariant.Account}
          type={icon as AvatarAccountType}
          accountAddress={address}
          size={AvatarSize.Md}
          style={styles.accountAvatar}
        />
      )}
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {title}
        </Text>
        {Boolean(address) && (
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {type === NotificationsToggleTypes.ACTIONS
              ? address.toLowerCase()
              : formatAddress(address, 'short').toLowerCase()}
          </Text>
        )}
      </View>
      <View style={styles.switchElement}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Switch
            style={styles.switch}
            value={isEnabled}
            onChange={handleToggleAccountNotifications}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            disabled={disabledSwitch}
            ios_backgroundColor={colors.border.muted}
            {...generateTestId(Platform, testId)}
          />
        )}
      </View>
    </View>
  );
};

export default React.memo(NotificationOptionToggle);
