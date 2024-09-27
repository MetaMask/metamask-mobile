// Third party dependencies.
import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { lightTheme } from '@metamask/design-tokens';

// External dependencies.
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';

// Internal dependencies.
import { walletActionDetails, WalletActionProps } from './WalletAction.types';
import styleSheet from './WalletAction.styles';
import Avatar, {
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';

const WalletAction = ({
  actionType,
  iconName,
  iconSize,
  onPress,
  containerStyle,
  iconStyle,
  actionID,
  disabled,
  ...props
}: WalletActionProps) => {
  const actionStrings = actionType ? walletActionDetails[actionType] : null;
  const actionTitle = actionStrings?.title ?? '';
  const actionDescription = disabled
    ? actionStrings?.disabledDescription
    : actionStrings?.description;
  const { colors } = lightTheme;
  const { styles } = useStyles(styleSheet, {});

  const avatarStyle = useMemo(
    () => ({
      ...iconStyle,
      backgroundColor: disabled ? colors.primary.muted : colors.primary.default,
    }),
    [disabled, colors, iconStyle],
  );

  const titleStyle = useMemo(
    () => (disabled ? { color: colors.text.muted } : undefined),
    [disabled, colors],
  );

  const descriptionStyle = useMemo(
    () => [
      styles.descriptionLabel,
      disabled ? { color: colors.text.muted } : undefined,
    ],
    [styles, disabled, colors],
  );

  return (
    <TouchableOpacity
      style={{ ...styles.base, ...containerStyle }}
      onPress={onPress}
      testID={actionID}
      disabled={disabled}
      {...props}
    >
      <Avatar
        variant={AvatarVariant.Icon}
        style={avatarStyle}
        size={iconSize}
        name={iconName}
        iconColor={colors.background.default}
      />
      <View>
        <Text variant={TextVariant.BodyLGMedium} style={titleStyle}>
          {actionTitle}
        </Text>
        <Text variant={TextVariant.BodyMD} style={descriptionStyle}>
          {actionDescription}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default WalletAction;
