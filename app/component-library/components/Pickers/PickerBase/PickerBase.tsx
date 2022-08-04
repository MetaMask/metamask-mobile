/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { useStyles } from '../../../hooks';
import Icon, { IconName, IconSize } from '../../Icon';

import { PickerBaseProps } from './PickerBase.types';
import styleSheet from './PickerBase.styles';

const PickerBase: React.FC<PickerBaseProps> = ({
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

export default PickerBase;
