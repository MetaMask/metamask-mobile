import React from 'react';
import { IconColor } from '../SnapUIRenderer/utils';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { ViewStyle } from 'react-native';
import { StyleProp } from 'react-native';

export type SnapUIIconProps = {
  name: IconName;
  color?: IconColor;
  size?: IconSize;
  style?: StyleProp<ViewStyle>;
};

export const SnapUIIcon = ({ name, color, size, style }: SnapUIIconProps) => {
  return <Icon name={name} size={size} color={color} style={style} />;
};
