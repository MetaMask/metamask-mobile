/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import { AvatarBaseSize } from '../../Avatars/AvatarBase';
import AvatarNetwork from '../../Avatars/AvatarNetwork';
import Icon, { IconName, IconSize } from '../../Icon';
import Text, { TextVariant } from '../../Text';
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
      <AvatarNetwork size={AvatarBaseSize.Xs} imageSource={imageSource} />
      <Text style={styles.label} variant={TextVariant.sBodyMD}>
        {label}
      </Text>
      <Icon size={IconSize.Xs} name={IconName.ArrowDownOutline} />
    </TouchableOpacity>
  );
};

export default PickerNetwork;
