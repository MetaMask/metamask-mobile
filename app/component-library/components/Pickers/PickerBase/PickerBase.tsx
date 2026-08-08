/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { forwardRef } from 'react';
import type { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Pressable from '../../../components-temp/Pressable';
import Icon, { IconName, IconSize } from '../../Icons/Icon';

// Internal dependencies.
import { PickerBaseProps } from './PickerBase.types';
import styleSheet from './PickerBase.styles';

const PickerBase = forwardRef<View, PickerBaseProps>(
  (
    { iconSize = IconSize.Md, style, dropdownIconStyle, children, ...props },
    ref,
  ) => {
    const { styles, theme } = useStyles(styleSheet, {
      style,
      dropdownIconStyle,
    });
    const { colors } = theme;

    return (
      <Pressable ref={ref} style={styles.base} {...props}>
        {children}
        <Icon
          size={iconSize}
          color={colors.icon.default}
          name={IconName.ArrowDown}
          style={styles.dropdownIcon}
        />
      </Pressable>
    );
  },
);

PickerBase.displayName = 'PickerBase';

export default PickerBase;
