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
import { WalletActionProps } from './WalletAction.types';
import styleSheet from './WalletAction.styles';
import Avatar, {
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';

const WalletAction = ({
  actionTitle,
  actionDescription,
  iconName,
  iconSize,
  onPress,
  containerStyle,
  iconStyle,
  actionID,
  ...props
}: WalletActionProps) => {
  const { colors } = lightTheme;
  const { styles } = useStyles(styleSheet, {});
  return (
    <TouchableOpacity
      style={{ ...styles.base, ...containerStyle }}
      onPress={onPress}
      testID={actionID}
      {...props}
    >
      <Avatar
        variant={AvatarVariant.Icon}
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
