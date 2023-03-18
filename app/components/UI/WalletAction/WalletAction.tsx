// Third party dependencies.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
// External dependencies.
import Icon from '../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import { useStyles } from '../../../component-library/hooks';
// Internal dependencies.
import { WalletActionI } from './WalletAction.types';
import styleSheet from './WalletAction.styles';

const WalletAction = ({
  actionTitle,
  actionDescription,
  iconName,
  iconSize,
  onPress,
  containerStyle,
  iconStyle,
  ...props
}: WalletActionI) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  return (
    <TouchableOpacity
      style={{ ...styles.base, ...containerStyle }}
      onPress={onPress}
      {...props}
    >
      <View style={styles.iconContainer}>
        <Icon
          name={iconName}
          color={colors.background.default}
          size={iconSize}
          style={iconStyle}
        />
      </View>
      <View>
        <Text variant={TextVariant.BodyLGMedium}>{actionTitle}</Text>
        <Text variant={TextVariant.BodyMD}>{actionDescription}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default WalletAction;
