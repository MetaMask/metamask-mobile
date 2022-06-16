/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useStyles } from '../../hooks';
import styleSheet from './BaseButton.styles';
import { BaseButtonProps } from './BaseButton.types';
import BaseText, { BaseTextVariant } from '../BaseText';
import Icon, { IconSize } from '../Icon';

const BaseButton = ({
  label,
  iconName,
  size,
  onPress,
  style,
  ...props
}: BaseButtonProps): JSX.Element => {
  const { styles } = useStyles(styleSheet, { style, size });
  return (
    <TouchableOpacity style={styles.base} {...props}>
      {iconName && (
        <Icon name={iconName} size={IconSize.Sm} style={styles.icon} />
      )}
      <BaseText
        onPress={onPress}
        suppressHighlighting
        variant={BaseTextVariant.sBodyMD}
      >
        {label}
      </BaseText>
    </TouchableOpacity>
  );
};

export default BaseButton;
