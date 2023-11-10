/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariant } from '../../Avatars/Avatar';
import Icon, { IconName, IconSize } from '../../Icons/Icon';
import Text, { TextVariant } from '../../Texts/Text';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { PickerNetworkProps } from './PickerNetwork.types';
import stylesheet from './PickerNetwork.styles';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { NAVBAR_NETWORK_TEXT } from '../../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import { PICKERNETWORK_ARROW_TESTID } from './PickerNetwork.constants';

const PickerNetwork = ({
  onPress,
  style,
  label,
  imageSource,
  ...props
}: PickerNetworkProps) => {
  const { styles } = useStyles(stylesheet, { style });

  return (
    <TouchableOpacity style={styles.base} onPress={onPress} {...props}>
      <Avatar
        variant={AvatarVariant.Network}
        size={AvatarSize.Xs}
        name={label}
        imageSource={imageSource}
      />
      <Text
        style={styles.label}
        numberOfLines={1}
        variant={TextVariant.BodyMD}
        {...generateTestId(Platform, NAVBAR_NETWORK_TEXT)}
      >
        {label}
      </Text>
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
