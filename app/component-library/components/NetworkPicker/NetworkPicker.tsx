/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { AvatarSize } from '../Avatar';
import { NetworkPickerProps } from './NetworkPicker.types';
import BaseText, { BaseTextVariant } from '../BaseText';
import stylesheet from './NetworkPicker.styles';
import { useStyles } from '../../../component-library/hooks';
import Icon, { IconName, IconSize } from '../Icon';
import AvatarNetwork from '../AvatarNetwork';

const NetworkPicker = ({
  onPress,
  style,
  networkLabel,
  networkImageUrl,
}: NetworkPickerProps) => {
  const { styles } = useStyles(stylesheet, { style });

  return (
    <TouchableOpacity style={styles.base} onPress={onPress}>
      <AvatarNetwork size={AvatarSize.Xs} networkImageUrl={networkImageUrl} />
      <BaseText style={styles.label} variant={BaseTextVariant.sBodyMD}>
        {networkLabel}
      </BaseText>
      <Icon size={IconSize.Xs} name={IconName.ArrowDownOutline} />
    </TouchableOpacity>
  );
};

export default NetworkPicker;
