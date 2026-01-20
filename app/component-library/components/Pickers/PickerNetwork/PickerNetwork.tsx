/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariant } from '../../Avatars/Avatar';
import Icon, { IconName, IconSize } from '../../Icons/Icon';
import Text, { TextVariant } from '../../Texts/Text';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { PickerNetworkProps } from './PickerNetwork.types';
import stylesheet from './PickerNetwork.styles';
import { WalletViewSelectorsIDs } from '../../../../components/Views/Wallet/WalletView.testIds';
import { PICKERNETWORK_ARROW_TESTID } from './PickerNetwork.constants';

const PickerNetwork = ({
  onPress,
  style,
  label,
  imageSource,
  hideNetworkName,
  isDisabled = false,
  ...props
}: PickerNetworkProps) => {
  const { styles } = useStyles(stylesheet, { style });

  return (
    <TouchableOpacity
      style={styles.base}
      onPress={onPress}
      disabled={isDisabled}
      {...props}
    >
      <View style={hideNetworkName ? styles.networkIconContainer : null}>
        <Avatar
          variant={AvatarVariant.Network}
          size={AvatarSize.Xs}
          name={label}
          imageSource={imageSource}
          testID={WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER}
          accessibilityLabel={label}
        />
      </View>
      {hideNetworkName ? null : (
        <Text
          style={styles.label}
          numberOfLines={1}
          variant={TextVariant.BodyMD}
          testID={WalletViewSelectorsIDs.NAVBAR_NETWORK_TEXT}
        >
          {label}
        </Text>
      )}
      {onPress && (
        <Icon
          size={IconSize.Xs}
          name={IconName.ArrowDown}
          testID={PICKERNETWORK_ARROW_TESTID}
        />
      )}
    </TouchableOpacity>
  );
};

export default PickerNetwork;
