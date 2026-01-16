/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { forwardRef } from 'react';
import { View } from 'react-native';

// External dependencies.
import TouchableOpacity from '../../../../components/Base/TouchableOpacity';
import { useStyles } from '../../../hooks';
import Icon, { IconName, IconSize } from '../../Icons/Icon';

// Internal dependencies.
import { PickerBaseProps } from './PickerBase.types';
import styleSheet from './PickerBase.styles';

const PickerBase: React.ForwardRefRenderFunction<View, PickerBaseProps> = (
  { iconSize = IconSize.Md, style, dropdownIconStyle, children, ...props },
  ref,
) => {
  const { styles, theme } = useStyles(styleSheet, { style, dropdownIconStyle });
  const { colors } = theme;

  return (
    <TouchableOpacity
      style={styles.base}
      {...props}
      ref={ref}
      testID={props.testID}
    >
      {children}
      <Icon
        size={iconSize}
        color={colors.icon.default}
        name={IconName.ArrowDown}
        style={styles.dropdownIcon}
      />
    </TouchableOpacity>
  );
};

export default forwardRef(PickerBase);
