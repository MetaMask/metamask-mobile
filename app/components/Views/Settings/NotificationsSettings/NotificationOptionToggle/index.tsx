import React, { useCallback } from 'react';
import { Platform, Switch, View } from 'react-native';
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
import { useSwitchNotifications } from '../../../../../util/notifications/hooks/useSwitchNotifications';
import { useListNotifications } from '../../../../../util/notifications/hooks/useNotifications';
import { TRIGGER_TYPES } from '../../../../../util/notifications';

interface NotificationOptionsToggleProps {
  address: string;
  title: string;
  icon?: AvatarAccountType | IconName;
  type?: string;
  triggerStatus?:
    | { triggerTypes: TRIGGER_TYPES; triggerEnabled: boolean }
    | undefined;
  testId?: string;
  disabled?: boolean;
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
  triggerStatus,
  testId,
  disabled,
}: NotificationOptionsToggleProps) => {
  const { switchAccountNotifications } = useSwitchNotifications();
  const { listNotifications } = useListNotifications();
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();

  const handleToggleAccountNotifications = useCallback(() => {
    const originalValue = triggerStatus?.triggerEnabled;
    switchAccountNotifications([address], !originalValue);
    listNotifications();
  }, [address, triggerStatus, listNotifications, switchAccountNotifications]);

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
        {address ? (
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {type === NotificationsToggleTypes.ACTIONS
              ? address
              : formatAddress(address, 'short')}
          </Text>
        ) : null}
      </View>
      <View style={styles.switchElement}>
        <Switch
          value={!!triggerStatus?.triggerEnabled}
          onValueChange={handleToggleAccountNotifications}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white}
          style={styles.switch}
          ios_backgroundColor={colors.border.muted}
          disabled={disabled}
          {...generateTestId(Platform, testId)}
        />
      </View>
    </View>
  );
};

export default React.memo(NotificationOptionToggle);
