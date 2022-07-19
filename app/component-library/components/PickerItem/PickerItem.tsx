/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useStyles } from '../../hooks';
import Icon, { IconName, IconSize } from '../Icon';
import styleSheet from './PickerItem.styles';
import { PickerItemProps } from './PickerItem.types';

const PickerItem: React.FC<PickerItemProps> = ({
  style,
  children,
  ...props
}) => {
  const { styles, theme } = useStyles(styleSheet, { style });
  const { colors } = theme;

  return (
    <TouchableOpacity style={styles.base} {...props}>
      {children}
      <Icon
        size={IconSize.Md}
        color={colors.icon.alternative}
        name={IconName.ArrowDownOutline}
        style={styles.dropdownIcon}
      />
    </TouchableOpacity>
  );
};

export default PickerItem;
