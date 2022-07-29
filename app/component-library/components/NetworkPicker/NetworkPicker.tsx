/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { BaseAvatarSize } from '../BaseAvatar';
import { NetworkPickerProps } from './NetworkPicker.types';
import BaseText, { BaseTextVariant } from '../BaseText';
import stylesheet from './NetworkPicker.styles';
import { useStyles } from '../../../component-library/hooks';
import Icon, { IconName, IconSize } from '../Icon';
import NetworkAvatar from '../NetworkAvatar';

const NetworkPicker = ({
  onPress,
  style,
  networkLabel,
  networkImageUrl,
}: NetworkPickerProps) => {
  const { styles } = useStyles(stylesheet, { style });

  return (
    <TouchableOpacity style={styles.base} onPress={onPress}>
      <NetworkAvatar
        size={BaseAvatarSize.Xs}
        networkImageUrl={networkImageUrl}
      />
      <BaseText style={styles.label} variant={BaseTextVariant.sBodyMD}>
        {networkLabel}
      </BaseText>
      <Icon size={IconSize.Xs} name={IconName.ArrowDownOutline} />
    </TouchableOpacity>
  );
};

export default NetworkPicker;
