/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import Avatar, { AvatarSizes, AvatarVariants } from '../../Avatars/Avatar';
import Icon, { IconName, IconSize } from '../../Icon';
import Text, { TextVariants } from '../../Texts/Text';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { PickerNetworkProps } from './PickerNetwork.types';
import stylesheet from './PickerNetwork.styles';

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
        variant={AvatarVariants.Image}
        size={AvatarSizes.Xs}
        imageSource={imageSource}
      />
      <Text style={styles.label} variant={TextVariants.sBodyMD}>
        {label}
      </Text>
      <Icon size={IconSize.Xs} name={IconName.ArrowDownOutline} />
    </TouchableOpacity>
  );
};

export default PickerNetwork;
