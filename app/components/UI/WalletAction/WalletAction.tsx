// Third party dependencies.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { lightTheme } from '@metamask/design-tokens';

// External dependencies.
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';

// Internal dependencies.
import { WalletActionProps, walletActionStrings } from './WalletAction.types';
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
  const actionStrings = actionType ? walletActionStrings[actionType] : null;
  const actionTitle = actionStrings?.title ?? '';
  const actionDescription = disabled
    ? actionStrings?.disabledDescription
    : actionStrings?.description;
  const { colors } = lightTheme;
  const { styles } = useStyles(styleSheet, {});

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
        style={iconStyle}
        size={iconSize}
        name={iconName}
        backgroundColor={
          disabled ? colors.primary.muted : colors.primary.default
        }
        iconColor={colors.background.default}
      />
      <View>
        <Text
          variant={TextVariant.BodyLGMedium}
          style={disabled ? { color: colors.text.muted } : undefined}
        >
          {actionTitle}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          style={[
            styles.descriptionLabel,
            disabled ? { color: colors.text.muted } : undefined,
          ]}
        >
          {actionDescription}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default WalletAction;
