// Third party dependencies.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
// External dependencies.
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import { useStyles } from '../../../component-library/hooks';
// Internal dependencies.
import { WalletActionProps } from './WalletAction.types';
import styleSheet from './WalletAction.styles';
import Avatar, {
  AvatarVariants,
} from '../../../component-library/components/Avatars/Avatar';

const WalletAction = ({
  actionTitle,
  actionDescription,
  iconName,
  iconSize,
  onPress,
  containerStyle,
  iconStyle,
  ...props
}: WalletActionProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  return (
    <TouchableOpacity
      style={{ ...styles.base, ...containerStyle }}
      onPress={onPress}
      {...props}
    >
      <Avatar
        variant={AvatarVariants.Icon}
        style={iconStyle}
        size={iconSize}
        name={iconName}
        backgroundColor={colors.primary.default}
        iconColor={colors.background.default}
      />
      <View>
        <Text variant={TextVariant.BodyLGMedium}>{actionTitle}</Text>
        <Text variant={TextVariant.BodyMD} style={styles.descriptionLabel}>
          {actionDescription}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default WalletAction;
