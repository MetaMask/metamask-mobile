/* eslint-disable react/prop-types */
import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { useStyles } from '../../hooks';
import BaseText, { BaseTextVariant } from '../BaseText';
import Icon, { IconSize } from '../Icon';
import styleSheet from './TabBarItem.styles';
import { TabBarItemProps } from './TabBarItem.types';

const TabBarItem = ({
  style,
  label,
  icon,
  isSelected,
  ...props
}: TabBarItemProps) => {
  const { styles, theme } = useStyles(styleSheet, { style, isSelected });
  const tabColor = useMemo(
    () =>
      isSelected ? theme.colors.primary.default : theme.colors.icon.alternative,
    [isSelected, theme],
  );

  return (
    <TouchableOpacity {...props} style={styles.base}>
      <Icon size={IconSize.Lg} name={icon} color={tabColor} />
      <BaseText variant={BaseTextVariant.sBodyMD} style={styles.label}>
        {label}
      </BaseText>
    </TouchableOpacity>
  );
};

export default TabBarItem;
