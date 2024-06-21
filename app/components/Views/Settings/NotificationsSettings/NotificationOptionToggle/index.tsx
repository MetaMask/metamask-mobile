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
import Avatar from '../../../../../component-library/components/Avatars/Avatar';
import { formatAddress } from '../../../../../util/address';
import Icon, {
  IconColor,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

interface NotificationOptionsToggleProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
  title: string;
  description?: string;
  value?: boolean;
  onOptionUpdated?: (enabled: boolean) => void;
  testId?: string;
  disabled?: boolean;
  type?: string;
}

/**
 * View that renders the toggle for notifications options
 * This component assumes that the parent will manage the state of the toggle. This is because most of the state is global.
 */
const NotificationOptionToggle = ({
  icon,
  title,
  description,
  value,
  testId,
  onOptionUpdated,
  disabled,
  type,
}: NotificationOptionsToggleProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();

  const handleOnValueChange = useCallback(
    (newValue: boolean) => {
      onOptionUpdated?.(newValue);
    },
    [onOptionUpdated],
  );

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
          accountAddress={description}
          size={AvatarSize.Md}
          style={styles.accountAvatar}
        />
      )}
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {title}
        </Text>
        {description ? (
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {type === NotificationsToggleTypes.ACTIONS
              ? description
              : formatAddress(description, 'short')}
          </Text>
        ) : null}
      </View>
      <View style={styles.switchElement}>
        <Switch
          value={value}
          onValueChange={(newValue: boolean) => handleOnValueChange(newValue)}
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
