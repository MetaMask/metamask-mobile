import React, { useCallback, useEffect, useState } from 'react';
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

interface NotificationOptionsToggleProps {
  address: string;
  title: string;
  icon?: AvatarAccountType | IconName;
  type?: string;
  testId?: string;

  isEnabled: boolean;
  isLoading?: boolean;
  disabledSwitch?: boolean;
  refetchAccountSettings: () => Promise<void>;
}

function useUpdateAccountSetting(address: string) {
  const { switchAccountNotifications } = useSwitchNotifications();
  const { listNotifications: refetch } = useListNotifications();

  // Local states
  const [loading, setLoading] = useState(false);

  const toggleAccount = useCallback(
    async (state: boolean) => {
      setLoading(true);
      try {
        await switchAccountNotifications([address], state);
        refetch();
      } catch {
        // Do nothing (we don't need to propagate this)
      }
      setLoading(false);
    },
    [address, refetch, switchAccountNotifications],
  );

  return { toggleAccount, loading };
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
}: NotificationOptionsToggleProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();
  const [status, setStatus] = useState<boolean | undefined>(isEnabled);

  const { toggleAccount } = useUpdateAccountSetting(address);

  useEffect(() => {
    setStatus(isEnabled);
  }, [isEnabled]);

  const onPress = async () => {
    setStatus(!status);
    await toggleAccount(!isEnabled);
  };

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
        <Switch
          value={status}
          onChange={onPress}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white}
          style={styles.switch}
          ios_backgroundColor={colors.border.muted}
          disabled={disabledSwitch}
          {...generateTestId(Platform, testId)}
        />
      </View>
    </View>
  );
};

export default React.memo(NotificationOptionToggle);
