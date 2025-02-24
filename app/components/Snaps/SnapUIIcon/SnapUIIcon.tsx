import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon/Icon.types';
import Icon from '../../../component-library/components/Icons/Icon';

export interface SnapUIIconProps {
  name: IconName;
  color?: IconColor;
  size?: IconSize;
  style?: StyleProp<ViewStyle>;
}

export const SnapUIIcon = ({ name, color, size, style }: SnapUIIconProps) => (
  <Icon name={name} size={size} color={color} style={style} />
);
