// Third party dependencies.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
// External dependencies.
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
// Internal dependencies.
import { WalletActionProps } from './AccountAction.types';
import styleSheet from './AccountAction.styles';
import Icon from '../../../component-library/components/Icons/Icon';

const AccountAction = ({
  actionTitle,
  iconName,
  iconSize,
  onPress,
  containerStyle,
  iconStyle,
  ...props
}: WalletActionProps) => {
  const { styles } = useStyles(styleSheet, {});
  return (
    <TouchableOpacity
      style={{ ...styles.base, ...containerStyle }}
      onPress={onPress}
      {...props}
    >
      <Icon style={iconStyle} size={iconSize} name={iconName} />
      <View>
        <Text variant={TextVariant.BodyLGMedium}>{actionTitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default AccountAction;
