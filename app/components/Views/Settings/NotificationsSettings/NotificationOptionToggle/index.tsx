import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { useSelector } from 'react-redux';
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
import Avatar from '../../../../../component-library/components/Avatars/Avatar';
import { formatAddress } from '../../../../../util/address';
import Icon, {
  IconColor,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { selectIsUpdatingMetamaskNotificationsAccount } from '../../../../../selectors/notifications';
import { useSwitchAccountNotifications, useSwitchAccountNotificationsChange } from '../../../../../util/notifications/hooks/useSwitchNotifications';
import { UseSwitchAccountNotificationsData } from '../../../../../util/notifications/hooks/types';

interface NotificationOptionsToggleProps {
  address: string;
  title: string;
  setData: (data: UseSwitchAccountNotificationsData) => void;
  listNotifications: () => void;
  icon?: any;
  type?: string;
  data?: UseSwitchAccountNotificationsData | undefined;
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
  setData,
  listNotifications,
  data,
  testId,
  disabled,
}: NotificationOptionsToggleProps) => {
  const isUpdatingMetamaskNotificationsAccount = useSelector(
    selectIsUpdatingMetamaskNotificationsAccount,
 );
 const { switchAccountNotifications } = useSwitchAccountNotifications();
 const { onChange } = useSwitchAccountNotificationsChange();

  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();

  const handleToggleAccountNotifications = useCallback(async () => {
    const originalValue = data?.[address];
    await onChange([address], !originalValue);
    listNotifications();
  }, [data, onChange]);

  useEffect(() => {
    const updateData = async () => {
      if (isUpdatingMetamaskNotificationsAccount.includes(address)) {
        const fetchedData = await switchAccountNotifications([address]);
        setData(fetchedData || {});
      }
    };
    updateData();
  }, [address, isUpdatingMetamaskNotificationsAccount]);

  return (
    <View style={styles.container}>
      {type === NotificationsToggleTypes.ACTIONS ? (
        <Icon
          name={icon}
          style={styles.icon}
          color={IconColor.Default}
          size={icon === 'Received' ? IconSize.Md : IconSize.Lg}
        />
      ) : (
        <Avatar
          variant={AvatarVariant.Account}
          type={icon}
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
          value={data?.[address] ?? false}
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
